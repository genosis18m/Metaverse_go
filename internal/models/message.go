package models

import "time"

// Message represents a chat message in a space
type Message struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Text      string    `json:"text"`
	UserID    string    `json:"userId"`
	SpaceID   string    `json:"spaceId"`
	CreatedAt time.Time `json:"createdAt"`
	User      User      `gorm:"foreignKey:UserID"`
	Space     Space     `gorm:"foreignKey:SpaceID"`
}
