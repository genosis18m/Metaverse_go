package models

// Avatar represents a user avatar
type Avatar struct {
	ID       string  `gorm:"primaryKey;type:varchar(255)" json:"id"`
	ImageURL *string `gorm:"column:imageUrl;type:text" json:"imageUrl"`
	Name     *string `gorm:"type:varchar(255)" json:"name"`

	// Relations
	Users []*User `gorm:"foreignKey:AvatarID" json:"users,omitempty"`
}

func (Avatar) TableName() string {
	return "Avatar"
}
