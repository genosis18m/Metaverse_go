package handlers

import (
	"net/http"
	"strings"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/middleware"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/gin-gonic/gin"
)

// UpdateMetadataRequest represents the update metadata request body
type UpdateMetadataRequest struct {
	AvatarID string `json:"avatarId" binding:"required"`
}

// UpdateMetadata updates the user's avatar
func UpdateMetadata(c *gin.Context) {
	var req UpdateMetadataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
		return
	}

	result := database.GetDB().Model(&models.User{}).Where("id = ?", userID).Update("avatar_id", req.AvatarID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Metadata updated"})
}

// GetBulkMetadata gets avatars for multiple users
func GetBulkMetadata(c *gin.Context) {
	idsString := c.DefaultQuery("ids", "[]")
	
	// Parse the IDs from format "[id1,id2,id3]"
	idsString = strings.TrimPrefix(idsString, "[")
	idsString = strings.TrimSuffix(idsString, "]")
	
	var userIDs []string
	if idsString != "" {
		userIDs = strings.Split(idsString, ",")
	}

	var users []models.User
	database.GetDB().Where("id IN ?", userIDs).Preload("Avatar").Find(&users)

	type AvatarResponse struct {
		UserID   string  `json:"userId"`
		AvatarID *string `json:"avatarId"`
	}

	avatars := make([]AvatarResponse, len(users))
	for i, user := range users {
		var avatarURL *string
		if user.Avatar != nil {
			avatarURL = user.Avatar.ImageURL
		}
		avatars[i] = AvatarResponse{
			UserID:   user.ID,
			AvatarID: avatarURL,
		}
	}

	c.JSON(http.StatusOK, gin.H{"avatars": avatars})
}
