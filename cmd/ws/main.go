package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/genosis18m/Metaverse_go/internal/database"
	ws "github.com/genosis18m/Metaverse_go/pkg/websocket"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// If this is not a websocket upgrade, return OK (for health checks)
	if r.Header.Get("Upgrade") != "websocket" {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
		return
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	log.Println("User connected")
	user := ws.NewUser(conn)
	user.HandleMessages()
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Get port from environment (Railway uses PORT)
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("WS_PORT")
	}
	if port == "" {
		port = "3001"
	}

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Live per-room online counts (read by the dashboard's hangout zones).
	http.HandleFunc("/counts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ws.GetRoomManager().Counts())
	})

	http.HandleFunc("/", handleWebSocket)

	log.Printf("WebSocket Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
