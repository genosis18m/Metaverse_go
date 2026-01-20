package main

import (
	"log"
	"os"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/handlers"
	"github.com/genosis18m/Metaverse_go/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Gin router
	r := gin.Default()

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes
		v1.POST("/signup", handlers.Signup)
		v1.POST("/signin", handlers.Signin)
		v1.GET("/elements", handlers.GetElements)
		v1.GET("/avatars", handlers.GetAvatars)

		// User routes (requires authentication)
		user := v1.Group("/user")
		user.Use(middleware.UserAuth())
		{
			user.POST("/metadata", handlers.UpdateMetadata)
			user.GET("/metadata/bulk", handlers.GetBulkMetadata)
		}

		// Space routes (requires authentication)
		space := v1.Group("/space")
		space.Use(middleware.UserAuth())
		{
			space.POST("/", handlers.CreateSpace)
			space.DELETE("/:spaceId", handlers.DeleteSpace)
			space.GET("/all", handlers.GetAllSpaces)
			space.POST("/element", handlers.AddElement)
			space.DELETE("/element", handlers.DeleteElement)
		}
		// Public space route (no auth required)
		v1.GET("/space/:spaceId", handlers.GetSpace)

		// Admin routes (requires admin role)
		admin := v1.Group("/admin")
		admin.Use(middleware.AdminAuth())
		{
			admin.POST("/element", handlers.CreateElement)
			admin.PUT("/element/:elementId", handlers.UpdateElement)
			admin.POST("/avatar", handlers.CreateAvatar)
			admin.POST("/map", handlers.CreateMap)
		}
	}

	// Get port from environment
	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("HTTP Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
