package middleware

import (
	"net/http"
	"strings"

	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gin-gonic/gin"
)

// UserAuth is middleware that validates JWT token for regular users
func UserAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("userId", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// AdminAuth is middleware that validates JWT token and checks for admin role
func AdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token"})
			c.Abort()
			return
		}

		// Check if user is admin
		if claims.Role != "Admin" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Admin access required"})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("userId", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// GetUserID retrieves the user ID from the gin context
func GetUserID(c *gin.Context) string {
	userID, exists := c.Get("userId")
	if !exists {
		return ""
	}
	return userID.(string)
}

// GetUserRole retrieves the user role from the gin context
func GetUserRole(c *gin.Context) string {
	role, exists := c.Get("role")
	if !exists {
		return ""
	}
	return role.(string)
}
