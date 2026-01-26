package websocket

// MessageType represents the type of WebSocket message
type MessageType string

const (
	TypeJoin             MessageType = "join"
	TypeMove             MessageType = "move"
	TypeChat             MessageType = "chat"
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
	SpaceID     string `json:"spaceId,omitempty"`
	Token       string `json:"token,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
	X           int    `json:"x,omitempty"`
	Y           int    `json:"y,omitempty"`
	Message     string `json:"message,omitempty"`
}

// OutgoingMessage represents a message to client
type OutgoingMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload"`
}

// SpaceJoinedPayload represents the payload when user joins a space
type SpaceJoinedPayload struct {
	Spawn    SpawnPoint    `json:"spawn"`
	Users    []UserInfo    `json:"users"`
	Messages []ChatMessage `json:"messages"`
}

// ChatMessage represents a chat history item
type ChatMessage struct {
	UserID    string `json:"userId"`
	Username  string `json:"username"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

// SpawnPoint represents a spawn position
type SpawnPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// UserInfo represents basic user info with position
type UserInfo struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

// UserJoinedPayload represents the payload when a new user joins
type UserJoinedPayload struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

// MovementPayload represents the payload for movement events
type MovementPayload struct {
	UserID string `json:"userId"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

// UserLeftPayload represents the payload when a user leaves
type UserLeftPayload struct {
	UserID string `json:"userId"`
}

// ChatPayload represents a chat message
type ChatPayload struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Message  string `json:"message"`
}
