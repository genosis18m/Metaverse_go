package handlers

import (
	"log"
	"net/http"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/gin-gonic/gin"
)

// FeaturedRoom is a public "hangout zone" anyone can drop into directly from
// the dashboard. These are seeded into the DB so the normal join flow works.
type FeaturedRoom struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Emoji       string `json:"emoji"`
	Description string `json:"description"`
	Dimensions  string `json:"dimensions"`
	Accent      string `json:"accent"`
	Width       int    `json:"-"`
	Height      int    `json:"-"`
}

// FeaturedRooms is the canonical list of public zones.
var FeaturedRooms = []FeaturedRoom{
	{ID: "zone-cafe", Name: "Café Corner", Emoji: "☕", Description: "Slow mornings, warm chatter.", Dimensions: "25x25", Accent: "peach", Width: 25, Height: 25},
	{ID: "zone-arcade", Name: "Arcade Alley", Emoji: "🎮", Description: "Neon nights, friendly games.", Dimensions: "30x30", Accent: "violet", Width: 30, Height: 30},
	{ID: "zone-lounge", Name: "Chill Lounge", Emoji: "🌙", Description: "Unwind, vibe, say anything.", Dimensions: "25x25", Accent: "mint", Width: 25, Height: 25},
	{ID: "zone-rooftop", Name: "Rooftop Sunset", Emoji: "🌇", Description: "Golden hour, every hour.", Dimensions: "20x20", Accent: "rose", Width: 20, Height: 20},
}

const systemUserID = "system"

// SeedFeaturedRooms makes sure every featured zone exists as a Space row.
// Idempotent — safe to call on every startup.
func SeedFeaturedRooms() {
	// Zones need an owner to satisfy the Space → User creator foreign key.
	var sys models.User
	if err := database.GetDB().First(&sys, "id = ?", systemUserID).Error; err != nil {
		if err := database.GetDB().Create(&models.User{
			ID:       systemUserID,
			Username: "system",
			Password: "",
			Role:     models.RoleUser,
		}).Error; err != nil {
			log.Printf("Failed to create system user for zones: %v", err)
			return
		}
	}

	for _, r := range FeaturedRooms {
		var existing models.Space
		if err := database.GetDB().First(&existing, "id = ?", r.ID).Error; err == nil {
			continue
		}
		if err := database.GetDB().Create(&models.Space{
			ID:        r.ID,
			Name:      r.Emoji + " " + r.Name,
			Width:     r.Width,
			Height:    r.Height,
			CreatorID: systemUserID,
		}).Error; err != nil {
			log.Printf("Failed to seed zone %s: %v", r.ID, err)
		}
	}
}

// GetFeaturedRooms returns the public hangout zones.
func GetFeaturedRooms(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"rooms": FeaturedRooms})
}
