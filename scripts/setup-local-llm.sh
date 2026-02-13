#!/bin/bash

set -e

echo "======================================"
echo "Local LLM Setup for OLXOutreach"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker daemon is running${NC}"

echo ""
echo "======================================"
echo "Step 1: Setting up directories"
echo "======================================"

# Create models directory
MODELS_DIR="$HOME/llm-models"
mkdir -p "$MODELS_DIR"
echo -e "${GREEN}✓ Created $MODELS_DIR${NC}"

# Create server directory
SERVER_DIR="$HOME/phi-llm-server"
mkdir -p "$SERVER_DIR"
echo -e "${GREEN}✓ Created $SERVER_DIR${NC}"

echo ""
echo "======================================"
echo "Step 2: Download Phi-3.5 Model"
echo "======================================"

MODEL_FILE="$MODELS_DIR/phi-3.5-mini-instruct-q4.gguf"

if [ -f "$MODEL_FILE" ]; then
    echo -e "${YELLOW}Model file already exists at $MODEL_FILE${NC}"
    read -p "Do you want to re-download it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping download..."
    else
        rm "$MODEL_FILE"
        echo "Downloading Phi-3.5-mini-instruct (Q4_K_M, ~2.4GB)..."
        echo "This will take 5-15 minutes depending on your internet speed..."
        curl -L --progress-bar -o "$MODEL_FILE" \
          "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"
        echo -e "${GREEN}✓ Model downloaded${NC}"
    fi
else
    echo "Downloading Phi-3.5-mini-instruct (Q4_K_M, ~2.4GB)..."
    echo "This will take 5-15 minutes depending on your internet speed..."
    curl -L --progress-bar -o "$MODEL_FILE" \
      "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"
    echo -e "${GREEN}✓ Model downloaded${NC}"
fi

# Verify file
if [ ! -f "$MODEL_FILE" ]; then
    echo -e "${RED}❌ Model file was not downloaded successfully${NC}"
    exit 1
fi

FILE_SIZE=$(du -h "$MODEL_FILE" | cut -f1)
echo -e "${GREEN}✓ Model file ready ($FILE_SIZE)${NC}"

echo ""
echo "======================================"
echo "Step 3: Create Docker Compose config"
echo "======================================"

cat > "$SERVER_DIR/docker-compose.yml" << 'EOF'
version: "3.9"

services:
  phi-llm:
    image: ghcr.io/ggml-org/llama.cpp:server
    container_name: phi-llm-server
    command:
      - "--model"
      - "/models/phi-3.5-mini-instruct-q4.gguf"
      - "--host"
      - "0.0.0.0"
      - "--port"
      - "8080"
      - "--ctx-size"
      - "4096"
      - "--n-gpu-layers"
      - "0"
    volumes:
      - ${HOME}/llm-models:/models:ro
    ports:
      - "8080:8080"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

echo -e "${GREEN}✓ Docker Compose config created${NC}"

echo ""
echo "======================================"
echo "Step 4: Start LLM Server"
echo "======================================"

cd "$SERVER_DIR"

# Check if container is already running
if docker ps | grep -q phi-llm-server; then
    echo -e "${YELLOW}Container is already running${NC}"
    read -p "Do you want to restart it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Restarting container..."
        docker compose down
        docker compose up -d
    fi
else
    echo "Starting LLM server container..."
    docker compose up -d
    echo -e "${GREEN}✓ Container started${NC}"
fi

echo ""
echo "Waiting for model to load (this may take 30-60 seconds)..."
sleep 10

# Wait for health check
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ LLM server is ready!${NC}"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Server did not start in time${NC}"
    echo "Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo "======================================"
echo "Step 5: Test the Server"
echo "======================================"

echo "Testing models endpoint..."
if curl -s http://localhost:8080/v1/models > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Models endpoint works${NC}"
else
    echo -e "${RED}❌ Models endpoint failed${NC}"
    exit 1
fi

echo "Testing chat completions..."
RESPONSE=$(curl -s http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-3.5-mini-instruct-q4.gguf",
    "messages": [{"role": "user", "content": "Sag hallo in einem Satz."}],
    "temperature": 0.3,
    "max_tokens": 50
  }')

if echo "$RESPONSE" | grep -q "choices"; then
    echo -e "${GREEN}✓ Chat completions work${NC}"
else
    echo -e "${RED}❌ Chat completions failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "======================================"
echo "Step 6: Configure Your App"
echo "======================================"

# Get the project directory (script is in scripts/ subdirectory)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"

echo "Checking $ENV_FILE..."

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    if ! grep -q "VITE_LLM_PROVIDER" "$ENV_FILE"; then
        echo "Adding LLM configuration to .env..."
        cat >> "$ENV_FILE" << 'EOF'

# LLM Configuration (Local Phi-3.5)
VITE_LLM_PROVIDER=openai-compatible
VITE_LLM_BASE_URL=http://localhost:8080
VITE_LLM_MODEL=phi-3.5-mini-instruct-q4.gguf
VITE_LLM_API_KEY=
EOF
        echo -e "${GREEN}✓ LLM config added to .env${NC}"
    else
        echo -e "${YELLOW}LLM config already exists in .env${NC}"
    fi
else
    echo -e "${YELLOW}.env file not found${NC}"
    echo "Please create it manually or copy from .env.example"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start your development server:"
echo "   cd $PROJECT_DIR"
echo "   npm run dev"
echo ""
echo "2. In the app:"
echo "   - Log in"
echo "   - Select a contact"
echo "   - Choose an email template"
echo "   - Click 'Generate with AI'"
echo ""
echo "Useful commands:"
echo "   • View logs:    docker compose logs -f"
echo "   • Stop server:  docker compose down"
echo "   • Start server: docker compose up -d"
echo "   • Check status: docker compose ps"
echo ""
echo "Server is running at: http://localhost:8080"
echo ""
