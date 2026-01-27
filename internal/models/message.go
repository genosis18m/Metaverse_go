package models

import "time"

// Message represents a chat message in a space
type Message struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	UserID    string    `gorm:"not null;index" json:"userId"`
	Username  string    `gorm:"not null" json:"username"` // Store display name used when message was sent
	SpaceID   string    `gorm:"not null;index" json:"spaceId"`
	Text      string    `gorm:"not null" json:"text"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"createdAt"`
	User      User      `gorm:"foreignKey:UserID"`
	Space     Space     `gorm:"foreignKey:SpaceID"`
}
