# Local LLM Setup Guide - Phi-3.5 with llama.cpp

This guide will help you run Phi-3.5 locally on your Mac for AI-powered email draft generation.

## What You're Setting Up

1. **llama.cpp server** - A lightweight HTTP server that runs the Phi-3.5 model
2. **Phi-3.5-mini-instruct GGUF** - Microsoft's 3.8B parameter model in GGUF format (CPU-optimized)
3. **Your React app** - Already configured, just needs the environment variables

---

## Phase 1: Install Prerequisites

### 1.1 Check if Docker is installed

Open Terminal and run:

```bash
docker --version
```

**If you see a version number** (e.g., `Docker version 24.0.0`), you're good. Skip to Phase 2.

**If you see "command not found"**, install Docker Desktop:

1. Visit https://www.docker.com/products/docker-desktop/
2. Download "Docker Desktop for Mac"
3. Open the downloaded `.dmg` file and drag Docker to Applications
4. Open Docker from Applications
5. Wait until you see "Docker Desktop is running" in the menu bar
6. Run `docker --version` again to confirm

---

## Phase 2: Download the Phi-3.5 Model

### 2.1 Create a models directory

```bash
mkdir -p ~/llm-models
cd ~/llm-models
```

### 2.2 Download Phi-3.5-mini-instruct GGUF

We'll use the Q4_K_M quantization (good balance of speed and quality for CPU):

```bash
# Download from Hugging Face (bartowski's quantized version)
curl -L -o phi-3.5-mini-instruct-q4.gguf \
  "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf"
```

**This will take 5-15 minutes depending on your internet speed** (file is ~2.4GB).

### 2.3 Verify the download

```bash
ls -lh ~/llm-models/
```

You should see:
```
phi-3.5-mini-instruct-q4.gguf   (around 2.4GB)
```

---

## Phase 3: Set Up the LLM Server

### 3.1 Create server directory

```bash
mkdir -p ~/phi-llm-server
cd ~/phi-llm-server
```

### 3.2 Create docker-compose.yml

Run this command to create the configuration file:

```bash
cat > docker-compose.yml << 'EOF'
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
```

### 3.3 Start the server

```bash
docker compose up -d
```

**What this does:**
- Downloads the llama.cpp server image (first time only, ~1-2 minutes)
- Starts the server in the background
- Mounts your models folder
- Exposes the API on `http://localhost:8080`

### 3.4 Check if it's running

```bash
docker compose ps
```

You should see:
```
NAME                IMAGE                              STATUS
phi-llm-server      ghcr.io/ggerganov/llama.cpp:...   Up X seconds
```

**View logs to confirm model loaded:**

```bash
docker compose logs -f
```

Look for lines like:
```
llama_model_load: loaded meta data with ...
llama_model_load: ... completed in ...
```

Press `Ctrl+C` to stop viewing logs.

---

## Phase 4: Test the LLM Server

### 4.1 Test health endpoint

```bash
curl http://localhost:8080/health
```

**Expected:** `{"status":"ok"}` or similar

### 4.2 Test models endpoint

```bash
curl http://localhost:8080/v1/models
```

**Expected:** JSON with model info

### 4.3 Test actual completion

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "phi-3.5-mini-instruct-q4.gguf",
    "messages": [
      {"role": "user", "content": "Antworte in einem Satz: Was ist deine Hauptfunktion?"}
    ],
    "temperature": 0.3,
    "max_tokens": 100
  }'
```

**Expected:** JSON response with a German sentence in the `choices[0].message.content` field.

**If this works, your LLM server is ready!**

---

## Phase 5: Configure Your React App

### 5.1 Navigate to your project

```bash
cd /Users/christiaandekock/Desktop/OlxOutreach/OLXSortd
```

### 5.2 Update .env file

Open your `.env` file and add these lines (or update if they exist):

```bash
# LLM Configuration (Local Phi-3.5)
VITE_LLM_PROVIDER=openai-compatible
VITE_LLM_BASE_URL=http://localhost:8080
VITE_LLM_MODEL=phi-3.5-mini-instruct-q4.gguf
VITE_LLM_API_KEY=
```

**Note:** `VITE_LLM_API_KEY` is empty because llama.cpp doesn't require auth by default locally.

Keep all your existing Azure/Graph variables unchanged.

### 5.3 Install dependencies (if not already done)

```bash
npm install
```

### 5.4 Start your development server

```bash
npm run dev
```

---

## Phase 6: Test the Full Flow

### 6.1 Open your app

Visit the URL shown in the terminal (usually `http://localhost:5173` or `http://localhost:3000`)

### 6.2 Log in and navigate

1. Sign in with your Microsoft account
2. Wait for contacts to load
3. Click on any contact that has a previous email

### 6.3 Test AI generation

1. Click "Compose Email" or the email icon for a contact
2. Select any email template
3. You should now see TWO buttons:
   - **"Create Draft"** (uses template)
   - **"Generate with AI"** (uses Phi-3.5)
4. Click **"Generate with AI"**
5. Wait 10-30 seconds (first generation is slower)
6. The email editor should open with an AI-generated subject and body

---

## Troubleshooting

### Problem: Docker command not found

**Solution:** Install Docker Desktop (see Phase 1.1)

### Problem: Port 8080 already in use

**Solution:** Stop the conflicting service or change the port:

1. Find what's using 8080:
   ```bash
   lsof -i :8080
   ```
2. Kill that process or edit `docker-compose.yml` and change `"8080:8080"` to `"8081:8080"`
3. Also update your `.env`: `VITE_LLM_BASE_URL=http://localhost:8081`

### Problem: Model file not found

**Error in logs:** `error loading model: unable to open file`

**Solution:**

1. Check the file exists:
   ```bash
   ls -lh ~/llm-models/
   ```
2. Check the filename matches in `docker-compose.yml`
3. Restart the container:
   ```bash
   cd ~/phi-llm-server
   docker compose restart
   ```

### Problem: "Generate with AI" button does nothing

**Check browser console:**

1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Click "Generate with AI"
4. Look for errors

**Common issues:**
- CORS error: llama.cpp should allow all origins by default
- Network error: Check if `http://localhost:8080` is reachable
- 404 error: Verify the endpoint with curl tests from Phase 4

### Problem: Response is gibberish or incomplete

**Solution:** The model might need more context or better parameters.

1. Stop the server:
   ```bash
   cd ~/phi-llm-server
   docker compose down
   ```
2. Edit `docker-compose.yml` and increase `ctx-size`:
   ```yaml
   - "--ctx-size"
   - "8192"  # was 4096
   ```
3. Restart:
   ```bash
   docker compose up -d
   ```

### Problem: Very slow response (>60 seconds)

**Possible causes:**
- CPU is busy with other tasks
- Model is too large for your hardware
- Not enough RAM

**Solutions:**
1. Close other applications
2. Try a smaller quantization (Q3 or Q2 instead of Q4)
3. Check CPU usage:
   ```bash
   docker stats phi-llm-server
   ```

### Problem: Can't connect to llama.cpp from browser

**Check if it's a CORS issue:**

The llama.cpp server might need explicit CORS headers. If you see CORS errors in browser console:

1. Stop the container:
   ```bash
   cd ~/phi-llm-server
   docker compose down
   ```
2. We'll add a reverse proxy or run llama.cpp with additional flags
3. Let me know and I'll provide an updated config

---

## Useful Commands

### Start the LLM server

```bash
cd ~/phi-llm-server
docker compose up -d
```

### Stop the LLM server

```bash
cd ~/phi-llm-server
docker compose down
```

### View real-time logs

```bash
cd ~/phi-llm-server
docker compose logs -f
```

### Restart the server

```bash
cd ~/phi-llm-server
docker compose restart
```

### Check server status

```bash
curl http://localhost:8080/health
```

---

## Next Steps: Deploying to Work Server

Once this works locally, deploying to your work server is nearly identical:

1. Copy the `docker-compose.yml` to the server
2. Copy or re-download the GGUF model on the server
3. Run `docker compose up -d` on the server
4. Update your React app's `.env` to point to the server's IP:
   ```bash
   VITE_LLM_BASE_URL=http://your-server-ip:8080
   ```
5. Rebuild and deploy your frontend

The beauty of this approach: **the same code works everywhere, only the URL changes**.

---

## Performance Notes

**On your Mac (M1/M2/M3):**
- First request: 15-30 seconds (model loading + inference)
- Subsequent requests: 5-15 seconds
- RAM usage: ~3-4 GB

**On work server (300GB RAM, no GPU):**
- Should be similar or faster if it has more CPU cores
- CPU inference scales well with more cores
- With 300GB RAM you could run much larger models if needed

---

## Questions or Issues?

If anything doesn't work:

1. Run the curl tests from Phase 4
2. Check the Docker logs: `docker compose logs`
3. Check browser console for errors
4. Share the exact error message and I'll help debug
