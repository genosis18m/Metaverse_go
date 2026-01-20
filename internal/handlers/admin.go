package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gin-gonic/gin"
)

// CreateElementRequest represents the create element request
type CreateElementRequest struct {
	ImageURL string `json:"imageUrl" binding:"required"`
	Width    int    `json:"width" binding:"required"`
	Height   int    `json:"height" binding:"required"`
	Static   bool   `json:"static"`
}

// UpdateElementRequest represents the update element request
type UpdateElementRequest struct {
	ImageURL string `json:"imageUrl" binding:"required"`
}

// CreateAvatarRequest represents the create avatar request
type CreateAvatarRequest struct {
	Name     string `json:"name" binding:"required"`
	ImageURL string `json:"imageUrl" binding:"required"`
}

// MapElementInput represents an element in a map
type MapElementInput struct {
	ElementID string `json:"elementId" binding:"required"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
}

// CreateMapRequest represents the create map request
type CreateMapRequest struct {
	Thumbnail       string            `json:"thumbnail" binding:"required"`
	Dimensions      string            `json:"dimensions" binding:"required"`
	Name            string            `json:"name" binding:"required"`
	DefaultElements []MapElementInput `json:"defaultElements"`
}

// CreateElement creates a new element (admin only)
func CreateElement(c *gin.Context) {
	var req CreateElementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	element := models.Element{
		ID:       utils.GenerateCUID(),
		Width:    req.Width,
		Height:   req.Height,
		Static:   req.Static,
		ImageURL: req.ImageURL,
	}

	database.GetDB().Create(&element)
	c.JSON(http.StatusOK, gin.H{"id": element.ID})
}

// UpdateElement updates an element (admin only)
func UpdateElement(c *gin.Context) {
	elementID := c.Param("elementId")

	var req UpdateElementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	result := database.GetDB().Model(&models.Element{}).Where("id = ?", elementID).Update("image_url", req.ImageURL)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Element not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Element updated"})
}

// CreateAvatar creates a new avatar (admin only)
func CreateAvatar(c *gin.Context) {
	var req CreateAvatarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	avatar := models.Avatar{
		ID:       utils.GenerateCUID(),
		Name:     &req.Name,
		ImageURL: &req.ImageURL,
	}

	database.GetDB().Create(&avatar)
	c.JSON(http.StatusOK, gin.H{"avatarId": avatar.ID})
}

// CreateMap creates a new map (admin only)
func CreateMap(c *gin.Context) {
	var req CreateMapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	// Parse dimensions
	dims := strings.Split(req.Dimensions, "x")
	if len(dims) != 2 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid dimensions format"})
		return
	}
	width, _ := strconv.Atoi(dims[0])
	height, _ := strconv.Atoi(dims[1])

	// Create map with elements
	mapModel := models.Map{
		ID:        utils.GenerateCUID(),
		Name:      req.Name,
		Width:     width,
		Height:    height,
		Thumbnail: req.Thumbnail,
	}

	database.GetDB().Create(&mapModel)

	// Create map elements
	for _, e := range req.DefaultElements {
		x := e.X
		y := e.Y
		mapElement := models.MapElement{
			ID:        utils.GenerateCUID(),
			MapID:     mapModel.ID,
			ElementID: e.ElementID,
			X:         &x,
			Y:         &y,
		}
		database.GetDB().Create(&mapElement)
	}

	c.JSON(http.StatusOK, gin.H{"id": mapModel.ID})
}
