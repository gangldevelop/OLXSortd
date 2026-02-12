# OLXSortd Documentation

## AI-Powered Email Drafting

OLXSortd now includes AI-powered email draft generation using local LLMs.

### Features

- **One-click AI drafts**: Generate professional German email replies based on previous conversations
- **Local or remote**: Works with local llama.cpp or managed APIs (OpenAI, Azure, etc.)
- **Editable output**: AI drafts are fully editable before sending
- **Context-aware**: Uses the most recent email with each contact as context

### Quick Start Guides

Choose the guide for your platform:

1. **[Dev Server Setup](./DEV_SERVER_SETUP.md)** - Windows Server setup with full specs (Intel Xeon, 256GB RAM)
2. **[LLM Quick Start](./LLM_QUICK_START.md)** - Mac/Linux automated setup (5 minutes)
3. **[Local LLM Setup](./LOCAL_LLM_SETUP.md)** - Detailed manual setup guide with troubleshooting

### Architecture

```
User clicks "Generate with AI"
    ↓
EmailComposer
    ↓
graphService.getLastEmailWithContact(email)  ← Fetch last email (cached)
    ↓
llmClient.generateDraft({lastEmailHtml, contactName, senderName, language})
    ↓
llmPrompt.buildDraftPrompt()  ← Build German prompt
    ↓
POST {BASE_URL}/v1/chat/completions  ← OpenAI-compatible API
    ↓
Parse JSON response → {subject, bodyHtml, bodyText}
    ↓
EmailEditor opens with AI draft (editable)
```

### Configuration

All configuration is via environment variables in `.env`:

```bash
VITE_LLM_PROVIDER=openai-compatible   # or "managed"
VITE_LLM_BASE_URL=http://localhost:8080
VITE_LLM_MODEL=phi-3.5-mini-instruct-q4.gguf
VITE_LLM_API_KEY=                     # Optional, for managed APIs
```

### Deployment Options

#### Windows Server (Production)
- Intel Xeon E5-2560 (16 cores, 32 threads)
- 256GB RAM, Windows Server (AMD64)
- llama.cpp with Phi-3.5 GGUF via Docker
- See: [DEV_SERVER_SETUP.md](./DEV_SERVER_SETUP.md)

#### Local Development (Mac/Linux)
- llama.cpp with Phi-3.5 GGUF via Docker
- CPU-only inference (no GPU required)
- See: [LLM_QUICK_START.md](./LLM_QUICK_START.md)

#### Production (Managed API)
```bash
VITE_LLM_PROVIDER=managed
VITE_LLM_BASE_URL=https://api.openai.com
VITE_LLM_MODEL=gpt-4-mini
VITE_LLM_API_KEY=sk-...
```

### Model Selection

**Phi-3.5-mini-instruct** (Recommended for CPU-only):
- 3.8B parameters
- German language support
- Q4_K_M quantization: ~2.4GB
- Inference time: 10-30s on modern CPU
- Perfect for work server with 300GB RAM

**Alternative models**:
- Larger: Phi-3-medium, Llama-3-8B (need more RAM/CPU)
- Smaller: Phi-2 (faster, less capable)
- Managed: GPT-4-mini, Claude (requires API key)

### Files Modified/Added

**New files:**
- `src/services/llmClient.ts` - LLM API client
- `src/utils/llmPrompt.ts` - Prompt builder with HTML→text conversion
- `scripts/setup-local-llm.sh` - Automated setup script (Mac/Linux)
- `docs/DEV_SERVER_SETUP.md` - Windows Server setup guide
- `docs/LOCAL_LLM_SETUP.md` - Detailed manual setup guide
- `docs/LLM_QUICK_START.md` - Quick reference (Mac/Linux)

**Modified files:**
- `src/components/EmailComposer.tsx` - Added "Generate with AI" button & logic
- `src/components/EmailEditor.tsx` - Accept initial AI draft props
- `.env.example` - Added LLM environment variables

### Usage in the App

1. Log in and navigate to a contact
2. Click the email icon or "Compose Email"
3. Select any template
4. You'll see two buttons:
   - **"Create Draft"** - Uses the selected template
   - **"Generate with AI"** - Uses the LLM
5. Click "Generate with AI"
6. Wait 10-30 seconds for the first generation
7. The editor opens with an AI-generated subject and body
8. Edit as needed, then save or send

### Performance Notes

**Local (Mac M1/M2/M3 with 16GB RAM):**
- First request: 15-30s (model loading)
- Subsequent: 5-15s
- RAM: ~3-4GB

**Dev server (256GB RAM, 16 cores, no GPU):**
- First request: 30-60s (model loading + generation)
- Subsequent: 5-10s
- RAM: ~52GB (48GB KV cache + 2.4GB model)
- Parallel slots: 4 simultaneous users
- See: [DEV_SERVER_SETUP.md](./DEV_SERVER_SETUP.md)

### Troubleshooting

Common issues and solutions are documented in:
- [LOCAL_LLM_SETUP.md](./LOCAL_LLM_SETUP.md#troubleshooting)

### Security Notes

**For demos/internal use:**
- llama.cpp server runs without auth by default
- Expose only on internal network/VPN
- Use `VITE_LLM_API_KEY` if you add auth

**For production:**
- Always use HTTPS
- Add authentication to llama.cpp (reverse proxy with auth)
- Or use managed API with proper key rotation
- Never commit API keys to git

### Next Steps

1. **Run locally first** to validate the feature
2. **Deploy to work server** using the same docker-compose.yml
3. **Demo to clients** with the work server setup
4. **Switch to managed API** later if needed (just change envs)

### Support

If you encounter issues:
1. Check the troubleshooting section in LOCAL_LLM_SETUP.md
2. Verify Docker is running: `docker ps`
3. Check server logs: `cd ~/phi-llm-server && docker compose logs -f`
4. Test endpoint: `curl http://localhost:8080/health`
5. Check browser console for frontend errors
