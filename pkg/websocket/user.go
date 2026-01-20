package websocket

import (
	"encoding/json"
	"log"
	"math/rand"
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
	SpaceID     string
	SpaceWidth  int
	SpaceHeight int
	X           int
	Y           int
	conn        *websocket.Conn
	mu          sync.Mutex
}

// NewUser creates a new user from a WebSocket connection
func NewUser(conn *websocket.Conn) *User {
	user := &User{
		ID:   utils.GenerateRandomString(10),
		X:    0,
		Y:    0,
		conn: conn,
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
		log.Printf("Invalid token: %v", err)
		u.conn.Close()
		return
	}

	u.UserID = claims.UserID

	// Find space
	var space models.Space
	result := database.GetDB().First(&space, "id = ?", spaceID)
	if result.Error != nil {
		log.Printf("Space not found: %v", result.Error)
		u.conn.Close()
		return
	}

	u.SpaceID = spaceID
	u.SpaceWidth = space.Width
	u.SpaceHeight = space.Height

	// Add user to room
	GetRoomManager().AddUser(spaceID, u)

	// Set random spawn position (ensure it's within bounds: 1 to size-2)
	if space.Width > 2 {
		u.X = rand.Intn(space.Width-2) + 1
	} else {
		u.X = 0
	}
	if space.Height > 2 {
		u.Y = rand.Intn(space.Height-2) + 1
	} else {
		u.Y = 0
	}

	// Get other users in the room
	roomUsers := GetRoomManager().GetRoomUsers(spaceID)
	userInfos := make([]UserInfo, 0)
	for _, user := range roomUsers {
		if user.ID != u.ID {
			userInfos = append(userInfos, UserInfo{
				UserID: user.UserID,
				X:      user.X,
				Y:      user.Y,
			})
		}
	}

	// Fetch chat history (last 50 messages)
	var messages []models.Message
	database.GetDB().Where("space_id = ?", spaceID).Order("created_at desc").Limit(50).Find(&messages)

	// Convert to ChatMessage struct (reverse order to show oldest first)
	chatHistory := make([]ChatMessage, len(messages))
	for i, msg := range messages {
		chatHistory[len(messages)-1-i] = ChatMessage{
			UserID:    msg.UserID,
			Message:   msg.Text,
			Timestamp: msg.CreatedAt.Format(time.RFC3339),
		}
	}

	// Send space-joined message to the user
	u.Send(OutgoingMessage{
		Type: TypeSpaceJoined,
		Payload: SpaceJoinedPayload{
			Spawn:    SpawnPoint{X: u.X, Y: u.Y},
			Users:    userInfos,
			Messages: chatHistory,
		},
	})

	// Broadcast user-joined to other users
	GetRoomManager().Broadcast(OutgoingMessage{
		Type: TypeUserJoined,
		Payload: UserJoinedPayload{
			UserID: u.UserID,
			X:      u.X,
			Y:      u.Y,
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
		return
	}

	// Reject invalid movement
	u.Send(OutgoingMessage{
		Type:    TypeMovementRejected,
		Payload: MovementPayload{UserID: u.UserID, X: u.X, Y: u.Y},
	})
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
		SpaceID:   u.SpaceID,
		CreatedAt: time.Now(),
	}
	database.GetDB().Create(&msg)

	// Broadcast chat message to all users in the room (including sender)
	GetRoomManager().Broadcast(OutgoingMessage{
		Type: TypeChat,
		Payload: ChatPayload{
			UserID:  u.UserID,
			Message: payload.Message,
		},
	}, nil, u.SpaceID) // Pass nil as sender to broadcast to EVERYONE including self
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
