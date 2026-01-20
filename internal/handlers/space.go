package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/middleware"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CreateSpaceRequest represents the create space request body
type CreateSpaceRequest struct {
	Name       string  `json:"name" binding:"required"`
	Dimensions string  `json:"dimensions" binding:"required"`
	MapID      *string `json:"mapId"`
}

// AddElementRequest represents the add element to space request
type AddElementRequest struct {
	SpaceID   string `json:"spaceId" binding:"required"`
	ElementID string `json:"elementId" binding:"required"`
	X         int    `json:"x" binding:"required"`
	Y         int    `json:"y" binding:"required"`
}

// DeleteElementRequest represents the delete element request
type DeleteElementRequest struct {
	ID string `json:"id" binding:"required"`
}

// CreateSpace creates a new space
func CreateSpace(c *gin.Context) {
	var req CreateSpaceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	userID := middleware.GetUserID(c)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
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

	// If no mapId provided, create empty space
	if req.MapID == nil || *req.MapID == "" {
		space := models.Space{
			ID:        utils.GenerateCUID(),
			Name:      req.Name,
			Width:     width,
			Height:    height,
			CreatorID: userID,
		}
		database.GetDB().Create(&space)
		c.JSON(http.StatusOK, gin.H{"spaceId": space.ID})
		return
	}

	// Find map
	var mapTemplate models.Map
	result := database.GetDB().Preload("MapElements").First(&mapTemplate, "id = ?", *req.MapID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Map not found"})
		return
	}

	// Create space with map elements in transaction
	var space models.Space
	err := database.GetDB().Transaction(func(tx *gorm.DB) error {
		space = models.Space{
			ID:        utils.GenerateCUID(),
			Name:      req.Name,
			Width:     mapTemplate.Width,
			Height:    mapTemplate.Height,
			CreatorID: userID,
		}
		if err := tx.Create(&space).Error; err != nil {
			return err
		}

		// Create space elements from map elements
		for _, me := range mapTemplate.MapElements {
			if me.X != nil && me.Y != nil {
				spaceElement := models.SpaceElement{
					ID:        utils.GenerateCUID(),
					SpaceID:   space.ID,
					ElementID: me.ElementID,
					X:         *me.X,
					Y:         *me.Y,
				}
				if err := tx.Create(&spaceElement).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error creating space"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"spaceId": space.ID})
}

// DeleteSpace deletes a space
func DeleteSpace(c *gin.Context) {
	spaceID := c.Param("spaceId")
	userID := middleware.GetUserID(c)

	var space models.Space
	result := database.GetDB().First(&space, "id = ?", spaceID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Space not found"})
		return
	}

	if space.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"message": "Unauthorized"})
		return
	}

	// Delete space elements first, then space
	database.GetDB().Where("space_id = ?", spaceID).Delete(&models.SpaceElement{})
	database.GetDB().Delete(&space)

	c.JSON(http.StatusOK, gin.H{"message": "Space deleted"})
}

// GetAllSpaces gets all spaces for the current user
func GetAllSpaces(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var spaces []models.Space
	database.GetDB().Where("creator_id = ?", userID).Find(&spaces)

	type SpaceResponse struct {
		ID         string  `json:"id"`
		Name       string  `json:"name"`
		Thumbnail  *string `json:"thumbnail"`
		Dimensions string  `json:"dimensions"`
	}

	response := make([]SpaceResponse, len(spaces))
	for i, s := range spaces {
		response[i] = SpaceResponse{
			ID:         s.ID,
			Name:       s.Name,
			Thumbnail:  s.Thumbnail,
			Dimensions: strconv.Itoa(s.Width) + "x" + strconv.Itoa(s.Height),
		}
	}

	c.JSON(http.StatusOK, gin.H{"spaces": response})
}

// GetSpace gets a specific space with its elements
func GetSpace(c *gin.Context) {
	spaceID := c.Param("spaceId")

	var space models.Space
	result := database.GetDB().Preload("Elements.Element").First(&space, "id = ?", spaceID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Space not found"})
		return
	}

	type ElementDetail struct {
		ID       string `json:"id"`
		ImageURL string `json:"imageUrl"`
		Width    int    `json:"width"`
		Height   int    `json:"height"`
		Static   bool   `json:"static"`
	}

	type ElementResponse struct {
		ID      string        `json:"id"`
		Element ElementDetail `json:"element"`
		X       int           `json:"x"`
		Y       int           `json:"y"`
	}

	elements := make([]ElementResponse, len(space.Elements))
	for i, e := range space.Elements {
		elements[i] = ElementResponse{
			ID: e.ID,
			Element: ElementDetail{
				ID:       e.Element.ID,
				ImageURL: e.Element.ImageURL,
				Width:    e.Element.Width,
				Height:   e.Element.Height,
				Static:   e.Element.Static,
			},
			X: e.X,
			Y: e.Y,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"dimensions": strconv.Itoa(space.Width) + "x" + strconv.Itoa(space.Height),
		"elements":   elements,
	})
}

// AddElement adds an element to a space
func AddElement(c *gin.Context) {
	var req AddElementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	userID := middleware.GetUserID(c)

	// Verify space ownership
	var space models.Space
	result := database.GetDB().First(&space, "id = ? AND creator_id = ?", req.SpaceID, userID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Space not found"})
		return
	}

	// Check bounds
	if req.X < 0 || req.Y < 0 || req.X > space.Width || req.Y > space.Height {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Point is outside of the boundary"})
		return
	}

	spaceElement := models.SpaceElement{
		ID:        utils.GenerateCUID(),
		SpaceID:   req.SpaceID,
		ElementID: req.ElementID,
		X:         req.X,
		Y:         req.Y,
	}
	database.GetDB().Create(&spaceElement)

	c.JSON(http.StatusOK, gin.H{"message": "Element added"})
}

// DeleteElement removes an element from a space
func DeleteElement(c *gin.Context) {
	var req DeleteElementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	userID := middleware.GetUserID(c)

	// Find space element with space info
	var spaceElement models.SpaceElement
	result := database.GetDB().Preload("Space").First(&spaceElement, "id = ?", req.ID)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Element not found"})
		return
	}

	// Check ownership
	if spaceElement.Space.CreatorID != userID {
		c.JSON(http.StatusForbidden, gin.H{"message": "Unauthorized"})
		return
	}

	database.GetDB().Delete(&spaceElement)
	c.JSON(http.StatusOK, gin.H{"message": "Element deleted"})
}
