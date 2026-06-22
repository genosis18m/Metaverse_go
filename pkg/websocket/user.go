package websocket

import (
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gorilla/websocket"
)

// User represents a connected WebSocket user
type User struct {
	ID          string
	UserID      string
	Username    string
	SpaceID     string
	SpaceWidth  int
	SpaceHeight int
	X           int
	Y           int
	conn        *websocket.Conn
	mu          sync.Mutex
	// nearby tracks which users are currently adjacent, so a "hi" only fires
	// when two players newly come close (not every tick they stay close).
	// Only touched by this user's own read goroutine — no lock needed.
	nearby map[string]bool
}

// NewUser creates a new user from a WebSocket connection
func NewUser(conn *websocket.Conn) *User {
	user := &User{
		ID:     utils.GenerateRandomString(10),
		X:      0,
		Y:      0,
		conn:   conn,
		nearby: make(map[string]bool),
	}
	return user
}

// HandleMessages listens for messages from the user
func (u *User) HandleMessages() {
	defer func() {
		u.Destroy()
		u.conn.Close()
	}()

	for {
		_, message, err := u.conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		var incomingMsg IncomingMessage
		if err := json.Unmarshal(message, &incomingMsg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		u.processMessage(incomingMsg)
	}
}

// processMessage handles different message types
func (u *User) processMessage(msg IncomingMessage) {
	switch msg.Type {
	case TypeJoin:
		u.handleJoin(msg.Payload)
	case TypeMove:
		u.handleMove(msg.Payload)
	case TypeChat:
		u.handleChat(msg.Payload)
	}
}

// handleJoin handles user joining a space
func (u *User) handleJoin(payload IncomingMessagePayload) {
	spaceID := payload.SpaceID
	token := payload.Token

	// Validate JWT token
	claims, err := utils.ValidateToken(token)
	if err != nil {
		// A token signed by the HTTP server but rejected here almost always
		// means the two services have different JWT_SECRET values.
		u.failJoin("authentication failed — token rejected (check JWT_SECRET matches the API server)", err)
		return
	}

	u.UserID = claims.UserID

	// Look up the username from the database
	var dbUser models.User
	if err := database.GetDB().First(&dbUser, "id = ?", u.UserID).Error; err != nil {
		u.failJoin("user not found", err)
		return
	}
	
	// Default to the canonical DB username, but honor a chosen display name
	// (custom or randomly generated) so people can join under a pseudonym.
	u.Username = dbUser.Username
	if dn := strings.TrimSpace(payload.DisplayName); dn != "" {
		u.Username = dn
	}

	// Find space
	var space models.Space
	result := database.GetDB().First(&space, "id = ?", spaceID)
	if result.Error != nil {
		u.failJoin("room not found", result.Error)
		return
	}

	u.SpaceID = spaceID
	u.SpaceWidth = space.Width
	u.SpaceHeight = space.Height

	// Add user to room
	GetRoomManager().AddUser(spaceID, u)

	// Spawn at center of the space
	u.X = space.Width / 2
	u.Y = space.Height / 2

	// Get other users in the room
	roomUsers := GetRoomManager().GetRoomUsers(spaceID)
	userInfos := make([]UserInfo, 0)
	for _, user := range roomUsers {
		if user.ID != u.ID {
			userInfos = append(userInfos, UserInfo{
				UserID:   user.UserID,
				Username: user.Username,
				X:        user.X,
				Y:        user.Y,
			})
		}
	}

	// Fetch chat history (last 50 messages)
	var messages []models.Message
	database.GetDB().Where("space_id = ?", spaceID).Order("created_at desc").Limit(50).Find(&messages)

	// Resolve all usernames in a single query to avoid an N+1 lookup per message.
	usernameByID := make(map[string]string)
	if len(messages) > 0 {
		seen := make(map[string]struct{}, len(messages))
		userIDs := make([]string, 0, len(messages))
		for _, msg := range messages {
			if _, ok := seen[msg.UserID]; !ok {
				seen[msg.UserID] = struct{}{}
				userIDs = append(userIDs, msg.UserID)
			}
		}
		var msgUsers []models.User
		database.GetDB().Where("id IN ?", userIDs).Find(&msgUsers)
		for _, mu := range msgUsers {
			usernameByID[mu.ID] = mu.Username
		}
	}

	// Convert to ChatMessage struct (reverse order to show oldest first)
	chatHistory := make([]ChatMessage, len(messages))
	for i, msg := range messages {
		// Prefer the pseudonym stored with the message; fall back to the
		// account username (older messages) and finally the raw ID.
		username := msg.Username
		if username == "" {
			username = usernameByID[msg.UserID]
		}
		if username == "" {
			username = msg.UserID
		}
		chatHistory[len(messages)-1-i] = ChatMessage{
			UserID:    msg.UserID,
			Username:  username,
			Message:   msg.Text,
			Timestamp: msg.CreatedAt.Format(time.RFC3339),
		}
	}

	// Send space-joined message to the user
	u.Send(OutgoingMessage{
		Type: TypeSpaceJoined,
		Payload: SpaceJoinedPayload{
			Spawn:      SpawnPoint{X: u.X, Y: u.Y},
			Users:      userInfos,
			Messages:   chatHistory,
			MyUsername: u.Username, // canonical DB username
		},
	})

	// Broadcast user-joined to other users
	GetRoomManager().Broadcast(OutgoingMessage{
		Type: TypeUserJoined,
		Payload: UserJoinedPayload{
			UserID:   u.UserID,
			Username: u.Username,
			X:        u.X,
			Y:        u.Y,
		},
	}, u, spaceID)
}

// handleMove handles user movement
func (u *User) handleMove(payload IncomingMessagePayload) {
	newX := payload.X
	newY := payload.Y

	// Check boundaries
	if newX < 0 || newX >= u.SpaceWidth || newY < 0 || newY >= u.SpaceHeight {
		// Reject out-of-bounds movement
		u.Send(OutgoingMessage{
			Type:    TypeMovementRejected,
			Payload: MovementPayload{UserID: u.UserID, X: u.X, Y: u.Y},
		})
		return
	}

	// Validate movement (only 1 step at a time)
	xDisp := abs(u.X - newX)
	yDisp := abs(u.Y - newY)

	if (xDisp == 1 && yDisp == 0) || (xDisp == 0 && yDisp == 1) {
		u.X = newX
		u.Y = newY

		// Broadcast movement to other users with userId
		GetRoomManager().Broadcast(OutgoingMessage{
			Type:    TypeMovement,
			Payload: MovementPayload{UserID: u.UserID, X: u.X, Y: u.Y},
		}, u, u.SpaceID)

		// Say hi to anyone we just bumped into
		u.greetNearby()
		return
	}

	// Reject invalid movement
	u.Send(OutgoingMessage{
		Type:    TypeMovementRejected,
		Payload: MovementPayload{UserID: u.UserID, X: u.X, Y: u.Y},
	})
}

// greetNearby fires a "hi" to both players whenever this user newly comes
// adjacent (within one tile) to another. Staying close doesn't re-fire.
func (u *User) greetNearby() {
	roomUsers := GetRoomManager().GetRoomUsers(u.SpaceID)
	newNearby := make(map[string]bool)

	for _, other := range roomUsers {
		if other.ID == u.ID {
			continue
		}
		if abs(other.X-u.X) <= 1 && abs(other.Y-u.Y) <= 1 {
			newNearby[other.ID] = true
			if !u.nearby[other.ID] {
				// Newly adjacent — greet both sides, each naming the other.
				u.Send(OutgoingMessage{
					Type:    TypeHi,
					Payload: HiPayload{UserID: other.UserID, Username: other.Username},
				})
				other.Send(OutgoingMessage{
					Type:    TypeHi,
					Payload: HiPayload{UserID: u.UserID, Username: u.Username},
				})
			}
		}
	}

	u.nearby = newNearby
}

// handleChat handles chat messages
func (u *User) handleChat(payload IncomingMessagePayload) {
	if u.SpaceID == "" {
		return
	}

	// Save message to database
	msg := models.Message{
		ID:        utils.GenerateCUID(),
		Text:      payload.Message,
		UserID:    u.UserID,
		Username:  u.Username, // store the display name (pseudonym) shown at send time
		SpaceID:   u.SpaceID,
		CreatedAt: time.Now(),
	}
	database.GetDB().Create(&msg)

	// Broadcast chat message to all users in the room (including sender)
	GetRoomManager().Broadcast(OutgoingMessage{
		Type: TypeChat,
		Payload: ChatPayload{
			UserID:   u.UserID,
			Username: u.Username,
			Message:  payload.Message,
		},
	}, nil, u.SpaceID) // Pass nil as sender to broadcast to EVERYONE including self
}

// failJoin reports why a join was refused — it logs the underlying error
// server-side and sends a typed error frame to the client before closing, so
// the user sees a reason instead of an avatar that silently never appears.
func (u *User) failJoin(reason string, err error) {
	log.Printf("Join refused (%s): %v", reason, err)
	u.Send(OutgoingMessage{
		Type:    TypeError,
		Payload: ErrorPayload{Message: reason},
	})
	u.conn.Close()
}

// Send sends a message to the user
func (u *User) Send(msg OutgoingMessage) {
	u.mu.Lock()
	defer u.mu.Unlock()

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	if err := u.conn.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Printf("Error sending message: %v", err)
	}
}

// Destroy cleans up when user disconnects
func (u *User) Destroy() {
	if u.SpaceID == "" {
		return
	}

	// Broadcast user-left to other users
	GetRoomManager().Broadcast(OutgoingMessage{
		Type:    TypeUserLeft,
		Payload: UserLeftPayload{UserID: u.UserID},
	}, u, u.SpaceID)

	// Remove user from room
	GetRoomManager().RemoveUser(u, u.SpaceID)
}

// abs returns absolute value
func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
