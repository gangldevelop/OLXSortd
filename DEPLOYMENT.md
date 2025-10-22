# GitHub Pages Deployment Guide

This guide will help you deploy OLXSortd to GitHub Pages for free hosting.

## 🚀 Quick Deployment

### Step 1: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. Save the settings

### Step 2: Push Your Code

The deployment will happen automatically when you push to the `main` branch:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Step 3: Wait for Deployment

1. Go to **Actions** tab in your GitHub repository
2. You'll see the "Deploy to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)
4. Once complete, your site will be available at:
   ```
   https://yourusername.github.io/OLXSortd/
   ```

## 🔧 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Install dependencies
npm install

# Build for GitHub Pages
npm run build:github

# Deploy to GitHub Pages
npm run deploy
```

## 📝 Environment Variables for Production

For production deployment, you'll need to update your environment variables:

1. **Azure Configuration**: Update your Azure app registration with the production URL:
   - Redirect URI: `https://yourusername.github.io/OLXSortd/auth/callback`

2. **Environment Variables**: Update your `.env` file:
   ```env
   VITE_AZURE_REDIRECT_URI=https://yourusername.github.io/OLXSortd/auth/callback
   ```

## 🔍 Troubleshooting

### Common Issues:

1. **404 Errors**
   - Make sure the base path in `vite.config.ts` matches your repository name
   - Check that GitHub Pages is enabled in repository settings

2. **Authentication Issues**
   - Update Azure app registration redirect URI to production URL
   - Verify environment variables are correct

3. **Build Failures**
   - Check GitHub Actions logs for specific error messages
   - Ensure all dependencies are properly installed

4. **Assets Not Loading**
   - Verify the `base` path in Vite config is correct
   - Check that all static assets are in the `dist` folder

### Debugging Steps:

1. **Check Build Locally**:
   ```bash
   npm run build:github
   npm run preview
   ```

2. **Verify GitHub Actions**:
   - Go to Actions tab
   - Check the latest workflow run
   - Look for any error messages

3. **Test Production Build**:
   ```bash
   npm run build:github
   # Serve the dist folder locally to test
   ```

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to your repository root:
   ```
   yourdomain.com
   ```

2. Update the GitHub Actions workflow to include the CNAME:
   ```yaml
   with:
     github_token: ${{ secrets.GITHUB_TOKEN }}
     publish_dir: ./dist
     cname: yourdomain.com
   ```

3. Configure DNS settings with your domain provider

## 📊 Deployment Status

You can check deployment status by:
- Going to the **Actions** tab in your repository
- Looking for the "Deploy to GitHub Pages" workflow
- Checking the **Pages** section in repository settings

## 🔄 Automatic Updates

Every time you push to the `main` branch:
1. GitHub Actions automatically builds the project
2. Deploys the new version to GitHub Pages
3. Your live site updates within minutes

## 📱 Testing Your Deployment

After deployment, test these features:
- [ ] Authentication with Microsoft
- [ ] Contact analysis functionality
- [ ] Email template selection
- [ ] Search and filtering
- [ ] Email composition and sending

## 🆘 Getting Help

If you encounter issues:
1. Check the GitHub Actions logs
2. Verify your environment variables
3. Test locally with `npm run build:github`
4. Check the browser console for errors

---

**Your OLXSortd prototype is now live on GitHub Pages! 🎉**
