package models

// Role represents user role type
type Role string

const (
	RoleAdmin Role = "Admin"
	RoleUser  Role = "User"
)

// User represents a user in the system
type User struct {
	ID       string  `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Username string  `gorm:"uniqueIndex;type:varchar(255);not null" json:"username"`
	Password string  `gorm:"type:varchar(255);not null" json:"-"`
	AvatarID *string `gorm:"type:varchar(255)" json:"avatarId"`
	Role     Role    `gorm:"type:varchar(50);not null" json:"role"`

	// Relations
	Avatar *Avatar  `gorm:"foreignKey:AvatarID" json:"avatar,omitempty"`
	Spaces []*Space `gorm:"foreignKey:CreatorID" json:"spaces,omitempty"`
}

func (User) TableName() string {
	return "User"
}
