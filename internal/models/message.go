package models

import "time"

// Message represents a chat message in a space
type Message struct {
	ID        string    `gorm:"primaryKey" json:"id"`
	Text      string    `json:"text"`
	UserID    string    `json:"userId"`
	Username  string    `json:"username"` // display name used at send time (may be a pseudonym)
	SpaceID   string    `json:"spaceId"`
	CreatedAt time.Time `json:"createdAt"`
	User      User      `gorm:"foreignKey:UserID"`
	Space     Space     `gorm:"foreignKey:SpaceID"`
}
