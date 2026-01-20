package websocket

// MessageType represents the type of WebSocket message
type MessageType string

const (
	TypeJoin             MessageType = "join"
	TypeMove             MessageType = "move"
	TypeSpaceJoined      MessageType = "space-joined"
	TypeUserJoined       MessageType = "user-joined"
	TypeMovement         MessageType = "movement"
	TypeMovementRejected MessageType = "movement-rejected"
	TypeUserLeft         MessageType = "user-left"
)

// IncomingMessage represents a message from client
type IncomingMessage struct {
	Type    MessageType           `json:"type"`
	Payload IncomingMessagePayload `json:"payload"`
}

// IncomingMessagePayload represents the payload of incoming message
type IncomingMessagePayload struct {
	SpaceID string `json:"spaceId,omitempty"`
	Token   string `json:"token,omitempty"`
	X       int    `json:"x,omitempty"`
	Y       int    `json:"y,omitempty"`
}

// OutgoingMessage represents a message to client
type OutgoingMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload"`
}

// SpaceJoinedPayload represents the payload when user joins a space
type SpaceJoinedPayload struct {
	Spawn SpawnPoint   `json:"spawn"`
	Users []UserInfo   `json:"users"`
}

// SpawnPoint represents a spawn position
type SpawnPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// UserInfo represents basic user info
type UserInfo struct {
	ID string `json:"id"`
}

// UserJoinedPayload represents the payload when a new user joins
type UserJoinedPayload struct {
	UserID string `json:"userId"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

// MovementPayload represents the payload for movement events
type MovementPayload struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// UserLeftPayload represents the payload when a user leaves
type UserLeftPayload struct {
	UserID string `json:"userId"`
}
