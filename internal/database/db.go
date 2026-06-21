package database

import (
	"context"
	"log"
	"net"
	"os"
	"time"

	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// customResolver uses 8.8.8.8 to bypass the broken system stub resolver (127.0.0.53)
var customResolver = &net.Resolver{
	PreferGo: true,
	Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
		d := net.Dialer{Timeout: 10 * time.Second}
		return d.DialContext(ctx, "udp", "8.8.8.8:53")
	},
}

// Connect initializes the database connection
func Connect() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	// Parse the DSN into a pgx ConnConfig so we can inject a custom dialer
	connConfig, err := pgx.ParseConfig(dsn)
	if err != nil {
		return err
	}

	// Override BOTH the lookup AND the dial to bypass the broken system resolver.
	// LookupFunc handles hostname→IP resolution; DialFunc handles the actual TCP connect.
	connConfig.LookupFunc = func(ctx context.Context, host string) ([]string, error) {
		addrs, err := customResolver.LookupHost(ctx, host)
		if err != nil {
			return nil, err
		}
		return addrs, nil
	}

	connConfig.DialFunc = func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, err
		}
		addrs, err := customResolver.LookupHost(ctx, host)
		if err != nil {
			return nil, err
		}
		d := &net.Dialer{Timeout: 15 * time.Second}
		return d.DialContext(ctx, network, net.JoinHostPort(addrs[0], port))
	}

	// Convert pgx ConnConfig back to a *sql.DB via stdlib
	sqlDB := stdlib.OpenDB(*connConfig)

	// Tune the connection pool. Without these the pool is effectively unbounded,
	// which can exhaust the Postgres connection limit under load (and leaves
	// idle connections open indefinitely).
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	db, err := gorm.Open(postgres.New(postgres.Config{
		Conn: sqlDB,
	}), &gorm.Config{
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
