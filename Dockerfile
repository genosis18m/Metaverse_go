# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install git (needed for go modules)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the HTTP server
RUN CGO_ENABLED=0 GOOS=linux go build -o http-server ./cmd/http/main.go

# Build the WebSocket server
RUN CGO_ENABLED=0 GOOS=linux go build -o ws-server ./cmd/ws/main.go

# Production stage
FROM alpine:latest

WORKDIR /app

# Install certificates for HTTPS
RUN apk --no-cache add ca-certificates

# Copy binaries from builder
COPY --from=builder /app/http-server .
COPY --from=builder /app/ws-server .

# Copy frontend build (if exists)
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose ports
EXPOSE 3000 3001

# Default command (can be overridden)
CMD ["./http-server"]
