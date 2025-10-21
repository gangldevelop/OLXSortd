# Azure Setup Guide for OLXSortd

This guide will help you set up Azure App Registration for testing OLXSortd with real Outlook data.

## Step 1: Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `OLXSortd-Dev` (or any name you prefer)
   - **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:3000/auth/callback`

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `User.Read` (should be there by default)
   - `Mail.Read`
   - `Mail.Send`
   - `Contacts.Read`

6. Click **Grant admin consent** (if you have admin rights) or ask your admin to do this

## Step 3: Generate Client Secret (Optional)

For testing purposes, you can use a client secret:

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `OLXSortd Development Secret`
4. Choose expiration (recommend 6 months for testing)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately - you won't be able to see it again!

## Step 4: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
# Get these from your Azure App Registration
VITE_AZURE_CLIENT_ID=your_actual_client_id_here
VITE_AZURE_CLIENT_SECRET=your_actual_client_secret_here

# Keep this as is for local development
VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# These can stay as default
VITE_GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0
VITE_GRAPH_SCOPES=User.Read,Mail.Read,Mail.Send,Contacts.Read
```

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000` in your browser

3. Click "Sign in with Microsoft"

4. You should see the Microsoft login page

5. After successful login, you should see your contacts and be able to send emails

## Troubleshooting

### Common Issues:

1. **"AADSTS50011: The reply URL specified in the request does not match"**
   - Make sure the redirect URI in Azure matches exactly: `http://localhost:3000/auth/callback`

2. **"Insufficient privileges to complete the operation"**
   - Check that all required permissions are granted
   - Make sure admin consent is given for the permissions

3. **"Application not found"**
   - Double-check your Client ID in the `.env` file
   - Make sure the app registration is in the correct Azure AD tenant

### Testing with Real Data:

Once authentication is working, you can:

1. **View Real Contacts**: The app will fetch your actual Outlook contacts
2. **Send Real Emails**: Test sending emails through the email editor
3. **Analyze Real Data**: The contact analysis will work with your actual email patterns

## Security Notes:

- Never commit your `.env` file to version control
- Use client secrets only for testing - for production, use certificates
- The current setup is for development/testing only
- For production deployment, you'll need additional security configurations

## Next Steps:

1. Test basic authentication and contact retrieval
2. Test email sending functionality
3. Integrate real contact data with the analysis engine
4. Set up proper error handling and user feedback
5. Configure for production deployment when ready

## API Endpoints Used:

- `GET /me` - Get current user info
- `GET /me/contacts` - Get user's contacts
- `GET /me/mailFolders/inbox/messages` - Get inbox messages
- `GET /me/mailFolders/sentitems/messages` - Get sent messages
- `POST /me/sendMail` - Send email

For more details, see the [Microsoft Graph API documentation](https://docs.microsoft.com/en-us/graph/).
