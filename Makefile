.PHONY: all build run-http run-ws clean test

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GORUN=$(GOCMD) run
GOTEST=$(GOCMD) test
GOCLEAN=$(GOCMD) clean
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Binary names
HTTP_BINARY=http-server
WS_BINARY=ws-server

# Build directories
BUILD_DIR=bin

all: build

build: build-http build-ws

build-http:
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(HTTP_BINARY) ./cmd/http

build-ws:
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(WS_BINARY) ./cmd/ws

run-http:
	$(GORUN) ./cmd/http/main.go

run-ws:
	$(GORUN) ./cmd/ws/main.go

clean:
	$(GOCLEAN)
	rm -rf $(BUILD_DIR)

deps:
	$(GOMOD) download
	$(GOMOD) tidy

test:
	$(GOTEST) -v ./...

# Run both servers (requires two terminals or use with &)
run-all:
	@echo "Starting HTTP server in background..."
	$(GORUN) ./cmd/http/main.go &
	@echo "Starting WebSocket server..."
	$(GORUN) ./cmd/ws/main.go

# Frontend commands
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

# Run everything for development
dev-all:
	@echo "Make sure to run 'make frontend-install' first"
	@echo "Starting all services..."
	$(GORUN) ./cmd/http/main.go &
	$(GORUN) ./cmd/ws/main.go &
	cd frontend && npm run dev
