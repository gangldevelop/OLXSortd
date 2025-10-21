import { useState, useEffect } from 'react';
import { ContactList } from './components/ContactList';
import { Authentication } from './components/Authentication';
import { EmailTemplateSelector } from './components/EmailTemplateSelector';
import { EmailEditor } from './components/EmailEditor';
import { ContactAnalysisService } from './services/contactAnalysisService';
import { graphService } from './services/microsoftGraphService';
import { getTemplateByCategory } from './data/emailTemplates';
import type { ContactWithAnalysis } from './types/contact';
import type { EmailTemplate } from './types/email';

// Compact Analysis Summary Component
function AnalysisSummary({ contacts, onCategoryClick, onDraftEmail }: { 
  contacts: ContactWithAnalysis[];
  onCategoryClick: (category: string | null) => void;
  onDraftEmail: (contact: ContactWithAnalysis) => void;
}) {
  const summary = {
    total: contacts.length,
    frequent: contacts.filter(c => c.category === 'frequent').length,
    inactive: contacts.filter(c => c.category === 'inactive').length,
    cold: contacts.filter(c => c.category === 'cold').length,
  };

  const contactsNeedingAttention = contacts.filter(contact => 
    contact.category === 'inactive' || 
    (contact.category === 'cold' && contact.emailCount > 0)
  ).sort((a, b) => {
    // Sort by response rate first, then by days since last contact
    if (a.responseRate !== b.responseRate) {
      return b.responseRate - a.responseRate;
    }
    if (a.lastContactDate && b.lastContactDate) {
      return b.lastContactDate.getTime() - a.lastContactDate.getTime();
    }
    return 0;
  });

  return (
    <div className="space-y-3">
          {/* Quick Stats */}
          <div className="bg-white rounded border p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis Summary</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <button 
                onClick={() => onCategoryClick(null)}
                className="p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                title="Show all contacts"
              >
                <div className="text-lg font-bold text-gray-900">{summary.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </button>
              <button 
                onClick={() => onCategoryClick('frequent')}
                className="p-2 rounded hover:bg-green-50 transition-colors cursor-pointer"
                title="Show frequent contacts"
              >
                <div className="text-lg font-bold text-green-600">{summary.frequent}</div>
                <div className="text-xs text-gray-500">Frequent</div>
              </button>
              <button 
                onClick={() => onCategoryClick('inactive')}
                className="p-2 rounded hover:bg-orange-50 transition-colors cursor-pointer"
                title="Show inactive contacts"
              >
                <div className="text-lg font-bold text-orange-600">{summary.inactive}</div>
                <div className="text-xs text-gray-500">Inactive</div>
              </button>
              <button 
                onClick={() => onCategoryClick('cold')}
                className="p-2 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                title="Show cold contacts"
              >
                <div className="text-lg font-bold text-gray-600">{summary.cold}</div>
                <div className="text-xs text-gray-500">Cold</div>
              </button>
            </div>
          </div>

      {/* Contacts Needing Attention */}
      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Needs Attention ({contactsNeedingAttention.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {contactsNeedingAttention.map((contact) => {
              const getCategoryColor = (category: string) => {
                switch (category) {
                  case 'frequent':
                    return 'bg-green-100 text-green-800 border-green-200';
                  case 'inactive':
                    return 'bg-orange-100 text-orange-800 border-orange-200';
                  case 'cold':
                    return 'bg-gray-100 text-gray-800 border-gray-200';
                  case 'warm':
                    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  default:
                    return 'bg-gray-100 text-gray-800 border-gray-200';
                }
              };

              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case 'frequent':
                    return '🔥';
                  case 'inactive':
                    return '⏰';
                  case 'cold':
                    return '❄️';
                  case 'warm':
                    return '🌡️';
                  default:
                    return '❓';
                }
              };

              const daysSinceLastContact = contact.lastContactDate 
                ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
                : null;

              return (
                <div key={contact.id} className="flex items-start justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getCategoryIcon(contact.category)}</span>
                      <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                      <span className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getCategoryColor(contact.category)}`}>
                        {contact.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{contact.emailCount} emails</span>
                      <span>Response: {Math.round(contact.responseRate * 100)}%</span>
                      <span>
                        {daysSinceLastContact !== null 
                          ? `${daysSinceLastContact}d ago`
                          : 'Never contacted'
                        }
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDraftEmail(contact)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors ml-2"
                    title="Draft email to this contact"
                  >
                    Draft
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [contacts, setContacts] = useState<ContactWithAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ displayName: string; mail: string; id: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactWithAnalysis | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const analysisService = new ContactAnalysisService();

  useEffect(() => {
    if (isAuthenticated) {
      analyzeContacts();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthenticated = (userInfo: { displayName: string; mail: string; id: string }) => {
    setUser(userInfo);
    setIsAuthenticated(true);
  };

  const handleDraftEmail = (contact: ContactWithAnalysis) => {
    setSelectedContact(contact);
    const template = getTemplateByCategory(contact.category === 'warm' || contact.category === 'hot' ? 'cold' : contact.category);
    setSelectedTemplate(template || null);
    setShowEditor(false);
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateDraft = () => {
    if (selectedTemplate) {
      setShowEditor(true);
    }
  };

  const handleSaveDraft = (draft: { subject: string; body: string; htmlBody: string }) => {
    console.log('Draft saved:', draft);
    setShowEditor(false);
    setSelectedContact(null);
    setSelectedTemplate(null);
  };

  const handleSendEmail = async (email: { subject: string; body: string; htmlBody: string; to: string }) => {
    try {
      console.log('Sending email via Graph API:', email);
      
      // Use the Graph API to send the email
      await graphService.sendEmail(email.to, email.subject, email.htmlBody, true);
      
      alert(`Email sent to ${email.to}!\nSubject: ${email.subject}`);
      setShowEditor(false);
      setSelectedContact(null);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setSelectedContact(null);
    setSelectedTemplate(null);
  };

  const handleCategoryClick = (category: string | null) => {
    setSelectedCategory(category);
    // Clear any selected contact/template when changing category
    setSelectedContact(null);
    setSelectedTemplate(null);
    setShowEditor(false);
  };

  // Filter contacts based on selected category
  const filteredContacts = selectedCategory 
    ? contacts.filter(contact => contact.category === selectedCategory)
    : contacts;

  const analyzeContacts = async (mode: 'quick' | 'balanced' | 'comprehensive' = 'balanced') => {
    setIsAnalyzing(true);
    setSelectedCategory(null); // Reset category filter when analyzing
    
    try {
      console.log(`Fetching real data from Microsoft Graph (${mode} mode)...`);
      
      // Debug authentication status
      await graphService.debugAuthStatus();
      
      // Ensure we have a valid access token before making API calls
      const token = await graphService.getAccessToken();
      if (!token) {
        throw new Error('No access token available. Please sign in again.');
      }
      
      console.log('Access token confirmed, fetching data...');
      
      // Configure analysis options based on mode
      let analysisOptions;
      let emailInteractionLimit;
      
      switch (mode) {
        case 'quick':
          analysisOptions = { quickMode: true };
          emailInteractionLimit = 1000;
          break;
        case 'comprehensive':
          analysisOptions = { useAllEmails: true, maxEmails: 50000 };
          emailInteractionLimit = 10000;
          break;
        default: // balanced
          analysisOptions = {};
          emailInteractionLimit = 200;
      }
      
      // Get real contacts and email interactions from Graph API
      const [realContacts, realEmailInteractions] = await Promise.all([
        graphService.getContactsForAnalysis(analysisOptions),
        graphService.getEmailInteractionsForAnalysis(emailInteractionLimit)
      ]);
      
      console.log(`Analyzing ${realContacts.length} contacts with ${realEmailInteractions.length} email interactions`);
      
      const analyzedContacts = analysisService.analyzeContacts(
        realContacts,
        realEmailInteractions
      );
      
      setContacts(analyzedContacts);
      console.log('Contact analysis completed successfully');
    } catch (error) {
      console.error('Failed to analyze contacts:', error);
      // Show user-friendly error message
      alert(`Failed to load your contacts and emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Authentication onAuthenticated={handleAuthenticated} />
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Outlook Add-in Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
      <div>
            <h1 className="text-lg font-semibold text-gray-900">OLXSortd</h1>
            <p className="text-xs text-gray-500">
              {user?.displayName} • {contacts.length} contacts
            </p>
          </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => analyzeContacts('quick')}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Quick'}
                </button>
                <button 
                  onClick={() => analyzeContacts('balanced')}
                  className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
                <button 
                  onClick={() => analyzeContacts('comprehensive')}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'All'}
                </button>
            <button 
              onClick={() => {
                graphService.signOut();
                setIsAuthenticated(false);
                setUser(null);
                setContacts([]);
              }}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

          {/* Main Content - Single Column for Outlook Sidebar */}
          <div className="p-4 space-y-4 h-full flex flex-col">
            <AnalysisSummary contacts={contacts} onCategoryClick={handleCategoryClick} onDraftEmail={handleDraftEmail} />
            
            {/* Category Filter Indicator */}
            {selectedCategory && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Showing {selectedCategory} contacts ({filteredContacts.length} of {contacts.length})
                  </span>
                  <button 
                    onClick={() => handleCategoryClick(null)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
            
            {/* Contacts Section - Fixed height with scrolling */}
            <div className="flex-1 min-h-0">
              <div className="h-full max-h-80 overflow-y-auto">
                <ContactList contacts={filteredContacts} onDraftEmail={handleDraftEmail} />
              </div>
            </div>

            {/* Email Templates Section - Always visible below contacts */}
            <div className="space-y-3">
              {/* Email Template Selection */}
              {selectedContact && !showEditor && (
                <EmailTemplateSelector
                  selectedCategory={selectedContact.category === 'warm' || selectedContact.category === 'hot' ? 'cold' : selectedContact.category}
                  onTemplateSelect={handleTemplateSelect}
                />
              )}

              {/* Create Draft Button */}
              {selectedTemplate && !showEditor && (
                <div className="flex justify-center">
                  <button onClick={handleCreateDraft} className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors">
                    Create Draft
        </button>
                </div>
              )}

              {/* Email Editor */}
              {showEditor && selectedTemplate && selectedContact && (
                <EmailEditor
                  template={selectedTemplate}
                  contactName={selectedContact.name}
                  contactEmail={selectedContact.email}
                  onSave={handleSaveDraft}
                  onSend={handleSendEmail}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
      </div>
  );
}

export default App;