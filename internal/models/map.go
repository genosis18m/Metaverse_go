package models

// Map represents a template map that can be used to create spaces
type Map struct {
	ID        string `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Width     int    `gorm:"not null" json:"width"`
	Height    int    `gorm:"not null" json:"height"`
	Name      string `gorm:"type:varchar(255);not null" json:"name"`
	Thumbnail string `gorm:"type:text;not null" json:"thumbnail"`

	// Relations
	MapElements []*MapElement `gorm:"foreignKey:MapID" json:"mapElements,omitempty"`
}

func (Map) TableName() string {
	return "Map"
}

// MapElement represents an element placed in a map template
type MapElement struct {
	ID        string `gorm:"primaryKey;type:varchar(255)" json:"id"`
	MapID     string `gorm:"type:varchar(255);not null" json:"mapId"`
	ElementID string `gorm:"type:varchar(255);not null" json:"elementId"`
	X         *int   `gorm:"type:int" json:"x"`
	Y         *int   `gorm:"type:int" json:"y"`

	// Relations
	Map     *Map     `gorm:"foreignKey:MapID" json:"map,omitempty"`
	Element *Element `gorm:"foreignKey:ElementID" json:"element,omitempty"`
}

func (MapElement) TableName() string {
	return "MapElements"
}
