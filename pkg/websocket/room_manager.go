package websocket

import (
	"sync"
)

// RoomManager manages rooms (spaces) and their users
type RoomManager struct {
	rooms map[string][]*User
	mu    sync.RWMutex
}

var instance *RoomManager
var once sync.Once

// GetRoomManager returns the singleton instance of RoomManager
func GetRoomManager() *RoomManager {
	once.Do(func() {
		instance = &RoomManager{
			rooms: make(map[string][]*User),
		}
	})
	return instance
}

// AddUser adds a user to a room
func (rm *RoomManager) AddUser(spaceID string, user *User) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if _, exists := rm.rooms[spaceID]; !exists {
		rm.rooms[spaceID] = []*User{user}
		return
	}
	rm.rooms[spaceID] = append(rm.rooms[spaceID], user)
}

// RemoveUser removes a user from a room
func (rm *RoomManager) RemoveUser(user *User, spaceID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	users, exists := rm.rooms[spaceID]
	if !exists {
		return
	}

	newUsers := make([]*User, 0)
	for _, u := range users {
		if u.ID != user.ID {
			newUsers = append(newUsers, u)
		}
	}
	rm.rooms[spaceID] = newUsers
}

// GetRoomUsers returns all users in a room
func (rm *RoomManager) GetRoomUsers(spaceID string) []*User {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	users, exists := rm.rooms[spaceID]
	if !exists {
		return []*User{}
	}
	return users
}

// Broadcast sends a message to all users in a room except the sender
func (rm *RoomManager) Broadcast(message OutgoingMessage, sender *User, spaceID string) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	users, exists := rm.rooms[spaceID]
	if !exists {
		return
	}

	for _, user := range users {
		// If sender is nil, broadcast to everyone. Otherwise skip sender.
		if sender == nil || user.ID != sender.ID {
			user.Send(message)
		}
	}
}
