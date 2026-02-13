#!/bin/bash

# OLXOutreach GitHub Pages Deployment Setup Script
# This script helps you set up GitHub Pages deployment for OLXOutreach

echo "🚀 OLXOutreach GitHub Pages Deployment Setup"
echo "========================================"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run 'git init' first."
    exit 1
fi

# Check if GitHub remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Error: No GitHub remote found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/OLXOutreach.git"
    exit 1
fi

echo "✅ Git repository detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating template..."
    cat > .env << EOF
# Microsoft Azure Configuration
VITE_AZURE_CLIENT_ID=your_azure_client_id_here
VITE_AZURE_CLIENT_SECRET=your_azure_client_secret_here
VITE_AZURE_REDIRECT_URI=https://yourusername.github.io/OLXOutreach/auth/callback

# Google Gmail Configuration (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# API Configuration
VITE_GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0
VITE_GRAPH_SCOPES=User.Read,Mail.Read,Mail.Send,Contacts.Read
EOF
    echo "📝 Please update .env with your actual credentials"
fi

# Test build
echo "🔨 Testing build..."
npm run build:github

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please check your code and try again."
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with real credentials"
echo "2. Enable GitHub Pages in your repository settings:"
echo "   - Go to Settings > Pages"
echo "   - Source: GitHub Actions"
echo "3. Push to master branch to deploy:"
echo "   git add ."
echo "   git commit -m 'Deploy to GitHub Pages'"
echo "   git push origin master"
echo ""
echo "Your app will be available at: https://yourusername.github.io/OLXOutreach/"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
