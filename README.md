# OLXOutreach 📧

**Smart Email Contact Management & Cold Outreach Tool for Outlook & Gmail**

OLXOutreach is an intelligent email contact management system focused on **outreach to contacts that have been contacted before but haven't been contacted in a while**. The app analyzes your email interactions to automatically categorize contacts and helps you **follow up and check in with contacts to potentially restart old leads**. Built as an Outlook Add-in and Gmail extension, it identifies opportunities for re-engagement and streamlines your outreach efforts.

## ✨ Features

### 🧠 Intelligent Contact Analysis
- **Smart Categorization**: Automatically categorizes contacts into **Recent**, **In Touch**, and **Inactive** based on email interaction patterns
- **Response Rate Tracking**: Calculates response rates and engagement metrics for each contact
- **Behavioral Insights**: Analyzes email frequency, response times, and conversation patterns
- **Performance Optimization**: Uses Web Workers for fast analysis of large contact databases (10,000+ contacts)

#### Contact Categorization Logic

The system automatically categorizes contacts based on their email interaction history:

**📅 Recent** (`recent`)
- Contacts with recent activity (last contact ≤ 30 days ago), OR
- High recent email frequency (≥ 2 emails in last 30 days), OR
- Good recent engagement (≥ 5 emails in last 90 days with ≥ 20% response rate)
- *These contacts are actively engaged and should be nurtured*

**🤝 In Touch** (`in_touch`)
- Contacts with good historical relationship (≥ 3 total emails)
- Decent responsiveness (≥ 30% response rate)
- Last contact within 120 days (about 4 months)
- *These contacts have a solid relationship but aren't very recent*

**⏰ Inactive** (`inactive`)
- All other contacts (long time since last touch or very sparse history)
- Contacts that haven't been contacted in a while or have minimal interaction
- *These contacts need re-engagement to restart old leads*

### 🔍 Advanced Search & Filtering
- **Real-time Search**: Search contacts by name, email, or company
- **Smart Filters**: Filter by response rate, last contact date, email count, and more
- **Flexible Sorting**: Sort by name, response rate, email count, or smart algorithm
- **Quick Access**: One-click filtering by contact category

### 📝 Professional Email Templates
- **Category-Specific Templates**: Tailored email templates dynamically matched to each contact's category (Recent, In Touch, Inactive)
- **Rich Text Editor**: Full-featured email composition with formatting options
- **Variable Substitution**: Dynamic placeholders (`{{name}}`, `{{senderName}}`, `{{company}}`, etc.) for personalization
- **Template Management**: Easy template selection and customization
- **Smart Template Selection**: When you click "Draft" on a contact, the suggested templates automatically match their category

#### Email Template System

Each contact category has specialized email templates:

- **Recent Contacts**: Templates for quick check-ins and maintaining active relationships
- **In Touch Contacts**: Templates for following up on previous conversations and maintaining momentum
- **Inactive Contacts**: Templates for reconnecting with contacts that have gone quiet, restarting old leads

### 🤖 AI-Powered Email Generation
- **One-Click AI Drafts**: Generate professional email replies based on previous conversations
- **Context-Aware**: Uses the most recent email with each contact as context for relevant replies
- **Local or Cloud**: Works with local LLM (Phi-3.5 via llama.cpp) or managed APIs (OpenAI, Azure)
- **Editable Output**: AI drafts are fully editable before sending
- **German Language Support**: Optimized for German business communication
- **Fast Generation**: 5-10 seconds per draft (after initial model loading)

For setup instructions, see:
- **Windows Server**: [DEV_SERVER_SETUP.md](./docs/DEV_SERVER_SETUP.md)
- **Mac/Linux**: [LLM_QUICK_START.md](./docs/LLM_QUICK_START.md)

### 📊 Analytics Dashboard
- **Contact Overview**: Visual summary of contact categories and metrics
- **Needs Attention**: Intelligently prioritized list of contacts requiring follow-up and re-engagement
- **Performance Metrics**: Response rates, engagement statistics, and trends
- **Progress Tracking**: Real-time analysis progress with detailed status updates

#### "Needs Attention" Logic

The **Needs Attention** section identifies contacts that are prime candidates for outreach and re-engagement. This is the core feature designed to help you **restart old leads** and **follow up with contacts that haven't been contacted in a while**.

**Inclusion Criteria:**

A contact appears in "Needs Attention" if they meet ALL of the following:
1. ✅ Have been contacted before (`emailCount > 0`)
2. ✅ Have a last contact date recorded
3. ✅ Haven't been contacted in at least **30 days**
4. ✅ Not tagged as "crossware"

**Category-Specific Rules:**

- **Inactive Contacts**: All inactive contacts with email history are included
- **In Touch Contacts**: Included if last contact was **60+ days ago** (good history but needs check-in)
- **Recent Contacts**: Included if last contact was **30+ days ago** (catching slipping relationships early)

**Prioritization Algorithm:**

Contacts are sorted by priority (highest first):
1. **Response Rate** (highest first) - Contacts with better historical response rates are prioritized
2. **Email Count** (highest first) - Contacts with more email history indicate more valuable relationships
3. **Days Since Last Contact** (most urgent first) - Contacts that haven't been contacted for longer periods are prioritized

**Why This Works:**

- 🎯 **Catches slipping relationships early**: Includes recent contacts that are starting to go stale (30+ days)
- 💎 **Includes valuable relationships**: In Touch contacts with good history but need re-engagement (60+ days)
- 📊 **Data-driven prioritization**: Focuses on contacts most likely to respond (higher response rates and more history)
- ⏰ **Time-based filtering**: Only shows contacts that actually need attention (minimum 30 days threshold)

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
   git clone https://github.com/your-username/OLXOutreach.git
   cd OLXOutreach
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
- **Automated Detection**: System automatically identifies contacts that need follow-up
- **Smart Prioritization**: Contacts are sorted by response rate, email history, and recency
- **Multi-Category Inclusion**: Includes Inactive, In Touch (60+ days), and Recent (30+ days) contacts
- **One-Click Drafting**: Click "Draft" to instantly compose re-engagement emails with category-matched templates
- **Tracking**: Monitor which contacts you've reached out to and their response patterns

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

## 🧬 How It Works

### Contact Analysis Process

1. **Email Collection**: Fetches all email interactions from your Outlook/Gmail account
2. **Interaction Analysis**: For each contact, analyzes:
   - Total email count (sent and received)
   - Response rate (percentage of sent emails that received replies)
   - Days since last contact
   - Email frequency in last 30/90 days
   - Conversation threads and patterns
3. **Category Assignment**: Assigns each contact to Recent, In Touch, or Inactive based on the categorization logic
4. **Confidence Scoring**: Calculates a confidence score (0-100) based on:
   - Amount of data available (more emails = higher confidence)
   - Recency of activity (recent activity = higher confidence)
   - Response rate (better response rate = higher confidence)
   - Category-specific adjustments
5. **Insights Generation**: Creates human-readable insights about each contact's communication patterns

### Analysis Metrics

The system calculates these key metrics for each contact:

- **Total Emails**: Total number of email interactions
- **Sent Emails**: Number of emails you sent to this contact
- **Received Emails**: Number of emails received from this contact
- **Response Rate**: Percentage of your sent emails that received replies (calculated thread-aware)
- **Days Since Last Contact**: Number of days since the last email interaction
- **Average Response Time**: Average time (in hours) for the contact to respond
- **Conversation Count**: Number of distinct email threads/conversations

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
- **Thread-Aware Calculations**: Response rate calculation considers email threads for accuracy

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

Your app will be available at: `https://yourusername.github.io/OLXOutreach/`

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
- 📧 Email: support@OLXOutreach.com
- 💬 Discord: [Join our community](https://discord.gg/OLXOutreach)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/OLXOutreach/issues)

## 🗺️ Roadmap

### Upcoming Features
- [x] **AI-Powered Email Generation**: LLM-based email draft generation (v0.0.5)
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
- **v0.0.5** - Refined categorization system (Recent, In Touch, Inactive) with improved "Needs Attention" logic for better outreach targeting

---


*OLXOutreach - Transform your email outreach with intelligent contact management*