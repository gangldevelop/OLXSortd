# OLXSortd 📧

**Smart Email Contact Management & Cold Outreach Tool for Outlook & Gmail**

OLXSortd is an intelligent email contact management system that analyzes your email interactions to categorize contacts and streamline your outreach efforts. Built as an Outlook Add-in and Gmail extension, it helps you identify warm leads, reconnect with inactive contacts, and optimize your email communication strategy.

## ✨ Features

### 🧠 Intelligent Contact Analysis
- **Smart Categorization**: Automatically categorizes contacts into Frequent, Warm, Hot, Cold, and Inactive based on email patterns
- **Response Rate Tracking**: Calculates response rates and engagement metrics for each contact
- **Behavioral Insights**: Analyzes email frequency, response times, and conversation patterns
- **Performance Optimization**: Uses Web Workers for fast analysis of large contact databases (10,000+ contacts)

### 🔍 Advanced Search & Filtering
- **Real-time Search**: Search contacts by name, email, or company
- **Smart Filters**: Filter by response rate, last contact date, email count, and more
- **Flexible Sorting**: Sort by name, response rate, email count, or smart algorithm
- **Quick Access**: One-click filtering by contact category

### 📝 Professional Email Templates
- **Category-Specific Templates**: Tailored templates for each contact category
- **Rich Text Editor**: Full-featured email composition with formatting options
- **Variable Substitution**: Dynamic placeholders for personalization
- **Template Management**: Easy template selection and customization

### 📊 Analytics Dashboard
- **Contact Overview**: Visual summary of contact categories and metrics
- **Needs Attention**: Prioritized list of contacts requiring follow-up
- **Performance Metrics**: Response rates, engagement statistics, and trends
- **Progress Tracking**: Real-time analysis progress with detailed status updates

### 🚀 Performance Features
- **Quick Analysis**: Fast analysis of recent contacts (~30 seconds)
- **Comprehensive Analysis**: Full database analysis with Web Workers (~3-5 minutes)
- **Batch Processing**: Efficient processing of large datasets
- **Real-time Updates**: Live progress tracking during analysis

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** for responsive, modern UI design
- **React Quill** for rich text email editing
- **Vite** for fast development and optimized builds

### Backend Integration
- **Microsoft Graph API** for Outlook integration
- **Azure AD Authentication** for secure user authentication
- **Gmail API** support for Gmail integration
- **Web Workers** for background processing

### Key Components

```
src/
├── components/           # React components
│   ├── Authentication.tsx    # Microsoft OAuth integration
│   ├── ContactList.tsx       # Contact display and management
│   ├── ContactSearch.tsx     # Advanced search and filtering
│   ├── EmailEditor.tsx       # Rich text email composition
│   ├── EmailTemplateSelector.tsx # Template selection
│   └── ProgressBar.tsx      # Analysis progress tracking
├── services/            # Business logic and API integration
│   ├── batchedContactAnalysis.ts # Batch processing engine
│   ├── contactAnalysisService.ts # Analysis orchestration
│   ├── contactAnalyzer.ts       # Core analysis algorithms
│   ├── microsoftGraphService.ts # Microsoft Graph API client
│   ├── progressTracker.ts      # Progress management
│   └── workers/                # Web Workers for performance
├── types/               # TypeScript type definitions
├── data/                # Static data and templates
└── store/               # State management (Zustand)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Microsoft Azure account (for Outlook integration)
- Google Cloud Console account (for Gmail integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/olxsortd.git
   cd olxsortd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   # Microsoft Azure Configuration
   VITE_AZURE_CLIENT_ID=your_azure_client_id
   VITE_AZURE_CLIENT_SECRET=your_azure_client_secret
   VITE_AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
   
   # Google Gmail Configuration
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # API Configuration
   VITE_GRAPH_API_ENDPOINT=https://graph.microsoft.com/v1.0
   VITE_GRAPH_SCOPES=User.Read,Mail.Read,Mail.Send,Contacts.Read
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Azure Setup

For detailed Azure configuration, see [AZURE_SETUP.md](./AZURE_SETUP.md).

## 📱 Usage

### 1. Authentication
- Click "Sign in with Microsoft" to authenticate with your Outlook account
- Grant necessary permissions for contact and email access

### 2. Contact Analysis
- **Quick Analysis**: Click "Quick" for fast analysis of recent contacts (~200 emails)
- **Full Analysis**: Click "All" for comprehensive analysis of all contacts
- Monitor progress with real-time updates and detailed statistics

### 3. Contact Management
- **Browse Categories**: Use the category pills to filter contacts
- **Search & Filter**: Use the search bar and advanced filters to find specific contacts
- **Sort Options**: Sort by name, response rate, email count, or smart algorithm

### 4. Email Composition
- **Select Contact**: Click "Draft" on any contact to start composing
- **Choose Template**: Select from category-specific email templates
- **Customize Content**: Use the rich text editor to personalize your message
- **Send or Save**: Send immediately or save as draft

### 5. Needs Attention
- Review contacts that need follow-up based on analysis
- Prioritize outreach efforts using engagement metrics
- Track response rates and communication patterns

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Platform-specific builds
npm run build:outlook   # Build for Outlook Add-in
npm run build:gmail    # Build for Gmail extension

# Code quality
npm run lint           # Run ESLint
npm run type-check     # TypeScript type checking
```

### Project Structure

The project follows a clean architecture pattern:

- **Components**: Reusable UI components with clear props interfaces
- **Services**: Business logic separated from UI concerns
- **Types**: Comprehensive TypeScript definitions for type safety
- **Workers**: Background processing for performance-critical operations
- **Data**: Static templates and configuration data

### Key Design Patterns

- **Separation of Concerns**: Clear separation between UI, business logic, and data
- **Performance Optimization**: Web Workers for CPU-intensive operations
- **Type Safety**: Comprehensive TypeScript coverage
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Error Handling**: Graceful error handling with user feedback

## 📊 Performance

### Analysis Performance
- **Quick Mode**: ~200 emails analyzed in 30 seconds
- **Full Mode**: 10,000+ contacts analyzed in 3-5 minutes
- **Web Workers**: Background processing prevents UI blocking
- **Batch Processing**: Efficient memory usage for large datasets

### Optimization Features
- **Debounced Search**: Prevents excessive API calls during typing
- **Memoized Calculations**: Cached analysis results for repeated operations
- **Lazy Loading**: Components loaded on demand
- **Efficient Rendering**: Optimized React rendering with proper keys

## 🔒 Security

### Authentication
- **OAuth 2.0**: Secure authentication with Microsoft and Google
- **Token Management**: Automatic token refresh and secure storage
- **Permission Scoping**: Minimal required permissions for functionality

### Data Privacy
- **Local Processing**: Contact analysis performed locally
- **No Data Storage**: No personal data stored on external servers
- **Secure Communication**: HTTPS for all API communications

## 🚀 Deployment

### GitHub Pages (Recommended for Prototypes)
```bash
# Automatic deployment via GitHub Actions
git push origin master

# Manual deployment
npm run build:github
npm run deploy
```

Your app will be available at: `https://yourusername.github.io/OLXSortd/`

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Outlook Add-in
```bash
npm run build:outlook
# Deploy the dist/ folder to your Outlook Add-in hosting
```

### Gmail Extension
```bash
npm run build:gmail
# Upload the dist/ folder to Chrome Web Store
```

### Other Web Hosting
```bash
npm run build
# Deploy the dist/ folder to your web hosting service
```

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## 🆘 Support

### Documentation
- [Azure Setup Guide](./AZURE_SETUP.md)
- [API Documentation](./docs/API.md)
- [Component Documentation](./docs/COMPONENTS.md)

### Troubleshooting

**Common Issues:**

1. **Authentication Errors**
   - Verify Azure app registration configuration
   - Check redirect URI matches exactly
   - Ensure admin consent is granted for permissions

2. **Analysis Performance**
   - Use Quick mode for initial testing
   - Close other browser tabs during full analysis
   - Check browser console for Web Worker errors

3. **Email Sending Issues**
   - Verify Mail.Send permission is granted
   - Check email template variables are properly filled
   - Ensure recipient email is valid

### Getting Help
- 📧 Email: support@olxsortd.com
- 💬 Discord: [Join our community](https://discord.gg/olxsortd)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/olxsortd/issues)

## 🗺️ Roadmap

### Upcoming Features
- [ ] **AI-Powered Insights**: Machine learning for contact scoring
- [ ] **Email Scheduling**: Schedule emails for optimal send times
- [ ] **A/B Testing**: Test different email templates and approaches
- [ ] **CRM Integration**: Connect with popular CRM systems
- [ ] **Team Collaboration**: Multi-user workspace support
- [ ] **Advanced Analytics**: Detailed reporting and insights dashboard

### Version History
- **v0.0.1** - Initial release with core functionality
- **v0.0.2** - Added Web Workers for performance
- **v0.0.3** - Enhanced search and filtering capabilities
- **v0.0.4** - Improved email editor and template system

---


*OLXSortd - Transform your email outreach with intelligent contact management*