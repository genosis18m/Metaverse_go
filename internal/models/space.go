package models

// Space represents a virtual space in the metaverse
type Space struct {
	ID        string  `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Name      string  `gorm:"type:varchar(255);not null" json:"name"`
	Width     int     `gorm:"not null" json:"width"`
	Height    int     `gorm:"not null" json:"height"`
	Thumbnail *string `gorm:"type:text" json:"thumbnail"`
	CreatorID string  `gorm:"type:varchar(255);not null" json:"creatorId"`

	// Relations
	Creator  *User           `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Elements []*SpaceElement `gorm:"foreignKey:SpaceID" json:"elements,omitempty"`
}

func (Space) TableName() string {
	return "Space"
}

// SpaceElement represents an element placed in a space
type SpaceElement struct {
	ID        string `gorm:"primaryKey;type:varchar(255)" json:"id"`
	ElementID string `gorm:"type:varchar(255);not null" json:"elementId"`
	SpaceID   string `gorm:"type:varchar(255);not null" json:"spaceId"`
	X         int    `gorm:"not null" json:"x"`
	Y         int    `gorm:"not null" json:"y"`

	// Relations
	Space   *Space   `gorm:"foreignKey:SpaceID" json:"space,omitempty"`
	Element *Element `gorm:"foreignKey:ElementID" json:"element,omitempty"`
}

func (SpaceElement) TableName() string {
	return "spaceElements"
}
