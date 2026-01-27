# 2D Metaverse - Golang Backend


deployed link: https://metaverse-frontend-production-3803.up.railway.app

<img width="2850" height="1654" alt="Screenshot from 2026-01-27 13-58-05" src="https://github.com/user-attachments/assets/eaf9929d-afad-4c16-972c-52d2c77db006" />


A real-time 2D metaverse application backend built with Go.

## Features

- **HTTP API Server**: RESTful API using Gin framework
- **WebSocket Server**: Real-time communication using Gorilla WebSocket
- **PostgreSQL Database**: Using GORM for database operations
- **JWT Authentication**: Secure user authentication

## Project Structure

```
go-backend/
├── cmd/
│   ├── http/          # HTTP API server entry point
│   └── ws/            # WebSocket server entry point
├── internal/
│   ├── database/      # Database connection and migrations
│   ├── handlers/      # HTTP request handlers
│   ├── middleware/    # Authentication middleware
│   ├── models/        # GORM database models
│   └── utils/         # Utility functions (JWT, password hashing)
├── pkg/
│   └── websocket/     # WebSocket server logic
├── go.mod
├── go.sum
└── README.md
```

## Prerequisites

- Go 1.21 or higher
- PostgreSQL database
- Environment variables configured

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/metaverse?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key
HTTP_PORT=3000
WS_PORT=3001
```

## Running the Application

### HTTP Server
```bash
go run cmd/http/main.go
```

### WebSocket Server
```bash
go run cmd/ws/main.go
```

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/signup` | Register a new user |
| POST | `/api/v1/signin` | Login and get JWT token |

### User Routes (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/user/metadata` | Update user avatar |
| GET | `/api/v1/user/metadata/bulk` | Get avatars for multiple users |

### Space Routes (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/space` | Create a new space |
| DELETE | `/api/v1/space/:spaceId` | Delete a space |
| GET | `/api/v1/space/all` | Get all user spaces |
| GET | `/api/v1/space/:spaceId` | Get space details |
| POST | `/api/v1/space/element` | Add element to space |
| DELETE | `/api/v1/space/element` | Remove element from space |

### Admin Routes (Requires Admin Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/element` | Create a new element |
| PUT | `/api/v1/admin/element/:elementId` | Update an element |
| POST | `/api/v1/admin/avatar` | Create a new avatar |
| POST | `/api/v1/admin/map` | Create a new map |

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/elements` | Get all elements |
| GET | `/api/v1/avatars` | Get all avatars |

## WebSocket Events

### Client to Server

- `join`: Join a space room
- `move`: Move user position

### Server to Client

- `space-joined`: Confirmation of joining space
- `user-joined`: New user joined the space
- `movement`: User movement broadcast
- `movement-rejected`: Invalid movement rejected
- `user-left`: User left the space

## License

MIT
