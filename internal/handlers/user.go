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

// UpdateUsernameRequest represents the username update request
type UpdateUsernameRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
}

// UpdateUsername updates the user's username
func UpdateUsername(c *gin.Context) {
	var req UpdateUsernameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username must be 3-50 characters"})
		return
	}

	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
		return
	}

	// Check if username already exists
	var existingUser models.User
	result := database.GetDB().Where("username = ? AND id != ?", req.Username, userID).First(&existingUser)
	if result.Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username already taken"})
		return
	}

	// Update username
	result = database.GetDB().Model(&models.User{}).Where("id = ?", userID).Update("username", req.Username)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update username"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Username updated", "username": req.Username})
}

// GetProfile returns the current user's profile
func GetProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
		return
	}

	var user models.User
	result := database.GetDB().Preload("Avatar").First(&user, "id = ?", userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	var avatarURL *string
	if user.Avatar != nil {
		avatarURL = user.Avatar.ImageURL
	}

	c.JSON(http.StatusOK, gin.H{
		"userId":    user.ID,
		"username":  user.Username,
		"avatarUrl": avatarURL,
		"role":      user.Role,
	})
}
