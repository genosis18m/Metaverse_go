package database

import (
	"log"
	"os"

	"github.com/genosis18m/Metaverse_go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect initializes the database connection
func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return err
	}

	DB = db
	log.Println("Database connection established successfully")
	return nil
}

// AutoMigrate runs auto-migration for all models
// Note: Since we're using existing Prisma schema, we typically don't need this
// But it's useful for development
func AutoMigrate() error {
	return DB.AutoMigrate(
		&models.User{},
		&models.Avatar{},
		&models.Space{},
		&models.SpaceElement{},
		&models.Element{},
		&models.Map{},
		&models.MapElement{},
		&models.Message{},
	)
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
