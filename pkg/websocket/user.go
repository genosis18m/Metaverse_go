package websocket

import (
	"encoding/json"
	"log"
	"math/rand"
	"sync"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gorilla/websocket"
)

// User represents a connected WebSocket user
type User struct {
	ID      string
	UserID  string
	SpaceID string
	X       int
	Y       int
	conn    *websocket.Conn
	mu      sync.Mutex
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

	// Add user to room
	GetRoomManager().AddUser(spaceID, u)

	// Set random spawn position
	u.X = rand.Intn(space.Width)
	u.Y = rand.Intn(space.Height)

	// Get other users in the room
	roomUsers := GetRoomManager().GetRoomUsers(spaceID)
	userInfos := make([]UserInfo, 0)
	for _, user := range roomUsers {
		if user.ID != u.ID {
			userInfos = append(userInfos, UserInfo{ID: user.ID})
		}
	}

	// Send space-joined message to the user
	u.Send(OutgoingMessage{
		Type: TypeSpaceJoined,
		Payload: SpaceJoinedPayload{
			Spawn: SpawnPoint{X: u.X, Y: u.Y},
			Users: userInfos,
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

	// Validate movement (only 1 step at a time)
	xDisp := abs(u.X - newX)
	yDisp := abs(u.Y - newY)

	if (xDisp == 1 && yDisp == 0) || (xDisp == 0 && yDisp == 1) {
		u.X = newX
		u.Y = newY

		// Broadcast movement to other users
		GetRoomManager().Broadcast(OutgoingMessage{
			Type:    TypeMovement,
			Payload: MovementPayload{X: u.X, Y: u.Y},
		}, u, u.SpaceID)
		return
	}

	// Reject invalid movement
	u.Send(OutgoingMessage{
		Type:    TypeMovementRejected,
		Payload: MovementPayload{X: u.X, Y: u.Y},
	})
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
