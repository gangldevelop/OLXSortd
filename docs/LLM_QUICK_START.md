# Quick Start: Run LLM Locally (5 Minutes)

## TL;DR

```bash
# 1. Run the automated setup script
cd /Users/christiaandekock/Desktop/OlxOutreach/OLXSortd
./scripts/setup-local-llm.sh

# 2. Start your app
npm run dev

# 3. Test it
# Open the app, select a contact, choose a template, click "Generate with AI"
```

That's it.

---

## What the script does

1. ✅ Checks Docker is installed and running
2. ✅ Creates `~/llm-models` directory
3. ✅ Downloads Phi-3.5-mini-instruct GGUF (~2.4GB)
4. ✅ Creates `~/phi-llm-server` with docker-compose.yml
5. ✅ Starts the llama.cpp server container
6. ✅ Tests the server endpoints
7. ✅ Updates your `.env` with LLM configuration

---

## Manual steps (if script fails)

### 1. Check Docker
```bash
docker --version
# If not installed, get it from: https://www.docker.com/products/docker-desktop/
```

### 2. Download model
```bash
mkdir -p ~/llm-models
cd ~/llm-models
curl -L -o phi-3.5-mini-instruct-q4.gguf \
  "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"
```

### 3. Create server config
```bash
mkdir -p ~/phi-llm-server
cd ~/phi-llm-server
```

Create `docker-compose.yml`:
```yaml
version: "3.9"
services:
  phi-llm:
    image: ghcr.io/ggerganov/llama.cpp:server
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
```

### 4. Start server
```bash
cd ~/phi-llm-server
docker compose up -d
```

### 5. Test
```bash
curl http://localhost:8080/v1/models
```

### 6. Update .env
Add to `/Users/christiaandekock/Desktop/OlxOutreach/OLXSortd/.env`:
```bash
VITE_LLM_PROVIDER=openai-compatible
VITE_LLM_BASE_URL=http://localhost:8080
VITE_LLM_MODEL=phi-3.5-mini-instruct-q4.gguf
VITE_LLM_API_KEY=
```

### 7. Run app
```bash
cd /Users/christiaandekock/Desktop/OlxOutreach/OLXSortd
npm run dev
```

---

## Common Commands

```bash
# Start LLM server
cd ~/phi-llm-server && docker compose up -d

# Stop LLM server
cd ~/phi-llm-server && docker compose down

# View logs
cd ~/phi-llm-server && docker compose logs -f

# Check status
docker ps | grep phi-llm

# Test endpoint
curl http://localhost:8080/health
```

---

## Troubleshooting

### "Port 8080 already in use"
```bash
# Find what's using it
lsof -i :8080

# Change port in docker-compose.yml
ports:
  - "8081:8080"  # Use 8081 instead

# Update .env
VITE_LLM_BASE_URL=http://localhost:8081
```

### "Generate with AI" button shows error
1. Check server is running: `curl http://localhost:8080/health`
2. Check browser console (F12) for error details
3. Verify `.env` has correct `VITE_LLM_BASE_URL`
4. Restart dev server: `npm run dev`

### Model takes forever to respond
- First request loads the model (~30s)
- Subsequent requests are faster (~10s)
- Close other apps to free CPU
- Check logs: `docker compose logs -f`

---

## Full Documentation

For detailed explanations, see: [LOCAL_LLM_SETUP.md](./LOCAL_LLM_SETUP.md)
