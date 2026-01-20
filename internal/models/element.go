package models

// Element represents a reusable element that can be placed in spaces or maps
type Element struct {
	ID       string `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Width    int    `gorm:"not null" json:"width"`
	Height   int    `gorm:"not null" json:"height"`
	Static   bool   `gorm:"not null" json:"static"`
	ImageURL string `gorm:"column:imageUrl;type:text;not null" json:"imageUrl"`

	// Relations
	SpaceElements []*SpaceElement `gorm:"foreignKey:ElementID" json:"spaceElements,omitempty"`
	MapElements   []*MapElement   `gorm:"foreignKey:ElementID" json:"mapElements,omitempty"`
}

func (Element) TableName() string {
	return "Element"
}
