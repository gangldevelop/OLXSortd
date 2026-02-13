# Deployment Guide

## Environment Files Setup

### ⚠️ NEVER commit these files to Git:
- `.env`
- `.env.production`
- `.env.local`
- `.env.production.local`

These files are in `.gitignore` and contain secrets!

### ✅ Safe to commit:
- `.env.example` - Template for development
- `.env.production.example` - Template for production

## Local Development Setup

1. Copy the example file:
```bash
cp .env.example .env
```

2. Fill in your actual values:
   - Azure App Registration details
   - LLM configuration

3. Run dev server:
```bash
npm run dev
```

## GitHub Pages Deployment

**Important**: GitHub Pages is a static host. The Vite proxy won't work in production!

### Option 1: Deploy with Public LLM URL

1. Set up GitHub Secrets:
   - Go to: Repository Settings → Secrets → Actions
   - Add these secrets:
     - `VITE_AZURE_CLIENT_ID`
     - `VITE_AZURE_CLIENT_SECRET`
     - `VITE_AZURE_REDIRECT_URI` (e.g., `https://yourusername.github.io/OLXOutreach/auth/callback`)
     - `VITE_LLM_BASE_URL` (your LLM tunnel or server URL)

2. Use GitHub Actions to build and deploy:
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_AZURE_CLIENT_ID: ${{ secrets.VITE_AZURE_CLIENT_ID }}
          VITE_AZURE_CLIENT_SECRET: ${{ secrets.VITE_AZURE_CLIENT_SECRET }}
          VITE_AZURE_REDIRECT_URI: ${{ secrets.VITE_AZURE_REDIRECT_URI }}
          VITE_LLM_BASE_URL: ${{ secrets.VITE_LLM_BASE_URL }}
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Option 2: Deploy Without LLM Feature

If you don't want to maintain a public LLM server:

1. Disable AI features in the UI
2. Only use manual email templates
3. Build and deploy without LLM configuration

## Cloudflare Tunnel Deployment (Current)

**Pros**: 
- Works great for testing
- Easy to set up
- LLM stays local

**Cons**: 
- URLs change each time (unless using named tunnel)
- 100-second timeout (can be extended)
- Not suitable for production

**Current Setup**:
- App: `https://portsmouth-hereby-fibre-gotta.trycloudflare.com`
- LLM: `https://excellence-incoming-ladies-army.trycloudflare.com`

## Production Deployment Options

### 1. Azure Static Web Apps (Recommended)
- ✅ Free tier available
- ✅ Built-in CI/CD
- ✅ Custom domains
- ✅ Environment variables via portal
- ✅ Can deploy backend function for LLM proxy

### 2. Vercel/Netlify
- ✅ Easy deployment
- ✅ Environment variables
- ✅ Custom domains
- ⚠️ Need separate LLM hosting

### 3. Self-Hosted
- ✅ Full control
- ✅ LLM on same server
- ⚠️ Need to manage infrastructure

## Quick Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview

# Deploy to GitHub Pages (manual)
npm run build
# Then push dist folder to gh-pages branch
```

## Security Checklist

- [ ] Never commit `.env` or `.env.production`
- [ ] Use GitHub Secrets for CI/CD
- [ ] Rotate Azure client secrets regularly
- [ ] Use HTTPS for all production URLs
- [ ] Review Azure App permissions
- [ ] Keep LLM server access restricted
