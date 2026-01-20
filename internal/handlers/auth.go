package handlers

import (
	"net/http"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gin-gonic/gin"
)

// SignupRequest represents the signup request body
type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Type     string `json:"type" binding:"required,oneof=user admin"`
}

// SigninRequest represents the signin request body
type SigninRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Signup handles user registration
func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Validation failed"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error hashing password"})
		return
	}

	// Determine role
	role := models.RoleUser
	if req.Type == "admin" {
		role = models.RoleAdmin
	}

	// Create user
	user := models.User{
		ID:       utils.GenerateCUID(),
		Username: req.Username,
		Password: hashedPassword,
		Role:     role,
	}

	result := database.GetDB().Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "User already exists"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"userId": user.ID})
}

// Signin handles user login
func Signin(c *gin.Context) {
	var req SigninRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "Validation failed"})
		return
	}

	// Find user
	var user models.User
	result := database.GetDB().Where("username = ?", req.Username).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"message": "User not found"})
		return
	}

	// Verify password
	if !utils.CheckPassword(req.Password, user.Password) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Invalid password"})
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error generating token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}
