package handlers

import (
	"net/http"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/gin-gonic/gin"
)

// GetElements returns all available elements
func GetElements(c *gin.Context) {
	var elements []models.Element
	database.GetDB().Find(&elements)

	type ElementResponse struct {
		ID       string `json:"id"`
		ImageURL string `json:"imageUrl"`
		Width    int    `json:"width"`
		Height   int    `json:"height"`
		Static   bool   `json:"static"`
	}

	response := make([]ElementResponse, len(elements))
	for i, e := range elements {
		response[i] = ElementResponse{
			ID:       e.ID,
			ImageURL: e.ImageURL,
			Width:    e.Width,
			Height:   e.Height,
			Static:   e.Static,
		}
	}

	c.JSON(http.StatusOK, gin.H{"elements": response})
}

// GetAvatars returns all available avatars
func GetAvatars(c *gin.Context) {
	var avatars []models.Avatar
	database.GetDB().Find(&avatars)

	type AvatarResponse struct {
		ID       string  `json:"id"`
		ImageURL *string `json:"imageUrl"`
		Name     *string `json:"name"`
	}

	response := make([]AvatarResponse, len(avatars))
	for i, a := range avatars {
		response[i] = AvatarResponse{
			ID:       a.ID,
			ImageURL: a.ImageURL,
			Name:     a.Name,
		}
	}

	c.JSON(http.StatusOK, gin.H{"avatars": response})
}
