# Cloudflare Tunnel Setup for OLXSortd

## Current Configuration

### Tunnels
- **App**: `https://portsmouth-hereby-fibre-gotta.trycloudflare.com` → `localhost:3000`
- **LLM**: `https://excellence-incoming-ladies-army.trycloudflare.com` → `localhost:8080`

### Environment
- **Development**: `.env` → Uses `/api/llm` (Vite proxy)
- **Production**: `.env.production` → Uses LLM tunnel URL directly

## 🚨 Timeout Issue

**Problem**: Cloudflare tunnels have a **100-second default timeout**. With Mistral 7B Q4 on CPU, longer emails might exceed this.

**Current Mitigation**: 
- `max_tokens: 512` in `llmClient.ts` (keeps generation fast)
- Email input truncated to 2000 chars (1500 for outreach)

## ✅ Recommended Tunnel Commands

### Option 1: Extend Timeout (Recommended)

Add timeout flags to your cloudflared commands:

```bash
# Terminal 1: App tunnel
cloudflared tunnel --url http://localhost:3000

# Terminal 2: LLM tunnel (with extended timeout)
cloudflared tunnel \
  --url http://localhost:8080 \
  --proxy-connect-timeout 300 \
  --proxy-no-happy-eyeballs
```

**Flags explained**:
- `--proxy-connect-timeout 300`: Extends timeout to 300 seconds (5 minutes)
- `--proxy-no-happy-eyeballs`: Disables parallel connection attempts (more stable)

### Option 2: Keep Current Setup

If you keep `max_tokens: 512` and input truncation, the default 100-second timeout should be sufficient. Most generations complete in 10-30 seconds.

## 🔧 Testing Timeout Scenarios

To test if you're hitting timeouts:

1. Try generating emails for contacts with long email histories
2. Monitor browser console for timeout errors
3. Check LLM server logs for completion times

If you see 524 errors (timeout), switch to Option 1 commands.

## 📊 Performance Expectations

With Mistral 7B Q4 on CPU:
- Short email (200 tokens): ~5-15 seconds
- Medium email (400 tokens): ~15-40 seconds
- Max tokens (512): ~20-60 seconds

**Recommendation**: Current `max_tokens: 512` keeps you under 100s timeout in most cases.

## 🔄 Updating Tunnel URLs

When tunnel URLs change (they're temporary), update:

1. **Azure App Registration**: Redirect URI
2. **`.env.production`**: `VITE_LLM_BASE_URL`
3. **`.env`**: `VITE_AZURE_REDIRECT_URI`

## 🚀 Production Deployment

For persistent tunnels, consider:

1. **Cloudflare Tunnel with custom domain** (named tunnel)
2. **Ngrok with custom domain** (paid plans have no timeout)
3. **Deploy to cloud** (Azure, AWS, etc.) with proper backend

## Current Status

✅ max_tokens: 512 (fast generation)  
✅ Input truncation: 2000 chars  
✅ Timeout risk: Low with current settings  
⚠️ Monitor for 524 errors, use extended timeout if needed
