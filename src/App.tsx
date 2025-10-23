import { useState, useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { ContactList } from './components/ContactList';
import { ContactSearch } from './components/ContactSearch';
import { Authentication } from './components/Authentication';
import { EmailTemplateSelector } from './components/EmailTemplateSelector';
import { EmailEditor } from './components/EmailEditor';
import { ProgressBar } from './components/ProgressBar';
import { BatchedContactAnalysis } from './services/batchedContactAnalysis';
import { graphService } from './services/microsoftGraphService';
import type { ContactWithAnalysis } from './types/contact';
import type { EmailTemplate } from './types/email';
import type { ProgressUpdate } from './services/progressTracker';

// Compact Analysis Summary Component
function AnalysisSummary({ contacts, onCategoryClick, onDraftEmail, onShowContactDetails }: { 
  contacts: ContactWithAnalysis[];
  onCategoryClick: (category: string | null) => void;
  onDraftEmail: (contact: ContactWithAnalysis) => void;
  onShowContactDetails: (contact: ContactWithAnalysis) => void;
}) {
  const [needsAttentionContacts, setNeedsAttentionContacts] = useState<ContactWithAnalysis[]>([]);
  const summary = {
    total: contacts.length,
    frequent: contacts.filter(c => c.category === 'frequent').length,
    inactive: contacts.filter(c => c.category === 'inactive').length,
    warm: contacts.filter(c => c.category === 'warm').length,
    hot: contacts.filter(c => c.category === 'hot').length,
    cold: contacts.filter(c => c.category === 'cold').length,
  };

  const contactsNeedingAttention = useMemo(() => {
    return contacts.filter(contact => 
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
  }, [contacts]);

  // Update needs attention contacts when contacts change
  useEffect(() => {
    setNeedsAttentionContacts(contactsNeedingAttention);
  }, [contactsNeedingAttention]);

  return (
    <div className="space-y-3">
          {/* Compact Analysis Summary */}
          <div className="bg-white rounded border p-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">Contact Categories</h3>
            <div className="flex flex-wrap gap-1">
              <button 
                onClick={() => onCategoryClick(null)}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Show all contacts"
              >
                All ({summary.total})
              </button>
              <button 
                onClick={() => onCategoryClick('frequent')}
                className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                title="Show frequent contacts"
              >
                Frequent ({summary.frequent})
              </button>
              <button 
                onClick={() => onCategoryClick('inactive')}
                className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                title="Show inactive contacts"
              >
                Inactive ({summary.inactive})
              </button>
              <button 
                onClick={() => onCategoryClick('warm')}
                className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                title="Show warm contacts"
              >
                Warm ({summary.warm})
              </button>
              <button 
                onClick={() => onCategoryClick('hot')}
                className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                title="Show hot contacts"
              >
                Hot ({summary.hot})
              </button>
              <button 
                onClick={() => onCategoryClick('cold')}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                title="Show cold contacts"
              >
                Cold ({summary.cold})
              </button>
            </div>
          </div>

      {/* Contacts Needing Attention */}
      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Needs Attention ({needsAttentionContacts.length})
          </h3>
          
          {/* Search for Needs Attention */}
          <div className="mb-3">
            <ContactSearch 
              contacts={contactsNeedingAttention}
              onFilteredContacts={setNeedsAttentionContacts}
              placeholder="Search contacts needing attention..."
              showAdvancedFilters={false}
            />
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {needsAttentionContacts.map((contact) => {
              const getCategoryColor = (category: string) => {
                switch (category) {
                  case 'frequent':
                    return 'bg-green-100 text-green-800 border-green-200';
                  case 'inactive':
                    return 'bg-orange-100 text-orange-800 border-orange-200';
                  case 'warm':
                    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  case 'hot':
                    return 'bg-red-100 text-red-800 border-red-200';
                  case 'cold':
                    return 'bg-gray-100 text-gray-800 border-gray-200';
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
                  case 'warm':
                    return '🌡️';
                  case 'hot':
                    return '🔥';
                  case 'cold':
                    return '❄️';
                  default:
                    return '❓';
                }
              };

              const daysSinceLastContact = contact.lastContactDate 
                ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
                : null;

              return (
                <div key={contact.id} className="flex items-start justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => onShowContactDetails(contact)}>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onDraftEmail(contact);
                    }}
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
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [filteredContacts, setFilteredContacts] = useState<ContactWithAnalysis[]>([]);
  const [selectedContactForDetails, setSelectedContactForDetails] = useState<ContactWithAnalysis | null>(null);
  const [lastEmailHtml, setLastEmailHtml] = useState<string | null>(null);
  const [isLoadingLastEmail, setIsLoadingLastEmail] = useState(false);
  const [lastEmailCategories, setLastEmailCategories] = useState<string[] | null>(null);
  
  // Snooze map persisted locally: email -> ISO date string
  const [snoozedUntilByEmail, setSnoozedUntilByEmail] = useState<Record<string, string>>({});
  
  const loadSnoozes = () => {
    try {
      const raw = localStorage.getItem('olx_snoozed_until');
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  };
  
  const saveSnoozes = (map: Record<string, string>) => {
    localStorage.setItem('olx_snoozed_until', JSON.stringify(map));
  };
  
  useEffect(() => {
    setSnoozedUntilByEmail(loadSnoozes());
  }, []);
  
  const isEmailSnoozed = (email: string) => {
    const iso = snoozedUntilByEmail[email];
    if (!iso) return false;
    return new Date(iso).getTime() > Date.now();
  };
  
  const handleSnoozeContact = (contact: ContactWithAnalysis, days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const updated = { ...snoozedUntilByEmail, [contact.email]: until.toISOString() };
    setSnoozedUntilByEmail(updated);
    saveSnoozes(updated);
    // Immediately re-apply filtering after snooze
    setFilteredContacts((prev) => prev.filter(c => c.email !== contact.email));
  };
  
  const batchedAnalysis = new BatchedContactAnalysis();
  const emailTemplatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      analyzeContacts();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (progress) {
      // Keep for debugging if needed
      // console.log('📊 Progress state updated:', progress);
    }
  }, [progress]);

  useEffect(() => {
    // console.log('Analysis state changed:', isAnalyzing);
  }, [isAnalyzing]);

  const handleAuthenticated = async (userInfo: { displayName: string; mail: string; id: string }) => {
    setUser(userInfo);
    setIsAuthenticated(true);

    // Ensure MSAL is initialized after authentication
    try {
      await graphService.initialize();
      console.log('MSAL initialized successfully in App component');
    } catch (error) {
      console.error('Failed to initialize MSAL in App component:', error);
    }
  };

  const handleDraftEmail = (contact: ContactWithAnalysis) => {
    setSelectedContact(contact);
    
    // Clear previously selected template so templates can be re-selected
    setSelectedTemplate(null);
    setShowEditor(false);
    
    // Auto-scroll to email templates section
    setTimeout(() => {
      emailTemplatesRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const handleShowContactDetails = async (contact: ContactWithAnalysis) => {
    setSelectedContactForDetails(contact);
    setIsLoadingLastEmail(true);
    setLastEmailHtml(null);
    setLastEmailCategories(null);
    try {
      const msg = await graphService.getLastEmailWithContact(contact.email);
      setLastEmailHtml(msg?.html ?? null);
      setLastEmailCategories((msg && Array.isArray((msg as any).categories)) ? (msg as any).categories : null);
    } finally {
      setIsLoadingLastEmail(false);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateDraft = () => {
    if (selectedTemplate) {
      setShowEditor(true);
    }
  };

  const handleSaveDraft = (_draft: { subject: string; body: string; htmlBody: string }) => {
    // console.log('Draft saved:', draft);
    setShowEditor(false);
    setSelectedContact(null);
    setSelectedTemplate(null);
  };

  const handleSendEmail = async (email: { subject: string; body: string; htmlBody: string; to: string }) => {
    try {
      // console.log('Sending email via Graph API:', email);
      
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
  const baseContacts = selectedCategory 
    ? contacts.filter(contact => contact.category === selectedCategory)
    : contacts;
  
  // Apply snooze filter (hide snoozed)
  const visibleContacts = baseContacts.filter(c => !isEmailSnoozed(c.email));

  // Update filtered contacts when inputs change (avoid depending on array identity)
  useEffect(() => {
    setFilteredContacts(visibleContacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, selectedCategory, snoozedUntilByEmail]);

  const analyzeContacts = async (mode: 'quick' | 'balanced' | 'comprehensive' = 'quick') => {
    setIsAnalyzing(true);
    setSelectedCategory(null);
    
    // Set initial progress immediately
    setProgress({
      stage: 'preparing_analysis',
      progress: 0,
      message: 'Initializing analysis...',
      itemsProcessed: 0,
      totalItems: 0
    });
    
    try {
      // console.log(`Fetching real data from Microsoft Graph (${mode} mode)...`);
      
      await graphService.debugAuthStatus();
      
      const token = await graphService.getAccessToken();
      if (!token) {
        throw new Error('No access token available. Please sign in again.');
      }
      
      // console.log('Access token confirmed, fetching data...');
      
      let analysisOptions;
      let emailInteractionLimit;
      
      switch (mode) {
        case 'quick':
          analysisOptions = { quickMode: true };
          emailInteractionLimit = 200; // last ~200 emails
          break;
        case 'comprehensive':
        default:
          analysisOptions = { useAllEmails: true, maxEmails: 50000 };
          emailInteractionLimit = 50000; // All within bounds
      }
      
      // console.log('Fetching contacts and email interactions...');
      
      setProgress({
        stage: 'preparing_analysis',
        progress: 5,
        message: 'Fetching contacts and emails from Microsoft Graph...',
        itemsProcessed: 0,
        totalItems: 0
      });
      
      const [realContacts, realEmailInteractions] = await Promise.all([
        graphService.getContactsForAnalysis(analysisOptions),
        graphService.getEmailInteractionsForAnalysis(emailInteractionLimit)
      ]);

      // console.log('Data fetch complete, starting analysis...');
      // console.log(`Analyzing ${realContacts.length} contacts with ${realEmailInteractions.length} email interactions`);
      
      setProgress({
        stage: 'preparing_analysis',
        progress: 10,
        message: `Found ${realContacts.length} contacts and ${realEmailInteractions.length} email interactions. Starting analysis...`,
        itemsProcessed: 0,
        totalItems: realContacts.length
      });
      
      // console.log('Starting batched analysis with callbacks...');
      
      const batchSize = batchedAnalysis.getRecommendedBatchSize(realContacts.length);
      // Increase concurrency for better performance
      const maxConcurrent = realContacts.length > 5000 ? 4 : realContacts.length > 1000 ? 3 : 2;
      
      // console.log(`Using batch size: ${batchSize}, max concurrent: ${maxConcurrent} for ${realContacts.length} contacts`);
      
      const analyzedContacts = await batchedAnalysis.analyzeContactsInBatches(
        realContacts,
        realEmailInteractions,
        {
          batchSize,
          maxConcurrentBatches: maxConcurrent,
          onProgress: (update) => {
            // console.log('✅ App: Received progress update:', JSON.stringify(update, null, 2));
            setProgress(update);
          },
          onComplete: () => {
            // console.log('✅ Batched analysis completed successfully');
          },
          onError: (error) => {
            console.error('❌ Batched analysis failed:', error);
            throw error;
          }
        }
      );
      
      setContacts(analyzedContacts);
      // console.log('Contact analysis completed successfully');
      
      // Ensure progress shows as complete before finishing
      setProgress({
        stage: 'finalizing_results',
        progress: 100,
        message: `Analysis complete! Processed ${analyzedContacts.length} contacts.`,
        itemsProcessed: analyzedContacts.length,
        totalItems: analyzedContacts.length
      });
      
      // Keep analyzing state for a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to analyze contacts:', error);
      alert(`Failed to load your contacts and emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
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
          <div className="min-h-screen bg-gray-50">
            <ProgressBar progress={progress} isVisible={isAnalyzing} />
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
                  title="Quick analysis (~30s) - Recent contacts only"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Quick'}
                </button>
                {/* Removed Analyze to simplify modes */}
                <button 
                  onClick={() => analyzeContacts('comprehensive')}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                  disabled={isAnalyzing}
                  title="Comprehensive analysis (~5-15min) - All contacts"
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
            <AnalysisSummary contacts={contacts} onCategoryClick={handleCategoryClick} onDraftEmail={handleDraftEmail} onShowContactDetails={handleShowContactDetails} />
            
            {/* Category Filter Indicator */}
            {selectedCategory && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Showing {selectedCategory} contacts ({filteredContacts.length} of {baseContacts.length})
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
              <div className="bg-white rounded border p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedCategory ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Contacts` : 'All Contacts'} ({filteredContacts.length})
                </h3>
                
                {/* Search and Filter Controls */}
                <div className="mb-3">
                  <ContactSearch 
                    contacts={visibleContacts}
                    onFilteredContacts={setFilteredContacts}
                    placeholder={`Search ${selectedCategory || 'all'} contacts...`}
                    showAdvancedFilters={true}
                  />
                </div>
                
                <div className="h-full max-h-80 overflow-y-auto">
                  <ContactList contacts={filteredContacts} onDraftEmail={handleDraftEmail} onViewEmail={handleShowContactDetails} onSnooze={handleSnoozeContact} />
                </div>
              </div>
            </div>

            {/* Email Templates Section - Always visible below contacts */}
            <div ref={emailTemplatesRef} className="space-y-3">
              {/* Email Template Selection */}
              {selectedContact && !showEditor && (
                <EmailTemplateSelector
                  key={selectedContact.id}
                  selectedCategory={selectedContact.category}
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
                  senderName={user?.displayName || 'Your Name'}
                  onSave={handleSaveDraft}
                  onSend={handleSendEmail}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
      {/* Email Details Modal - Outlook Add-in Optimized */}
      {selectedContactForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {selectedContactForDetails.name}
                </h3>
                <p className="text-xs text-gray-600 truncate">{selectedContactForDetails.email}</p>
                {lastEmailCategories && lastEmailCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {lastEmailCategories.map((cat) => (
                      <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedContactForDetails(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light hover:bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center transition-colors ml-2 flex-shrink-0"
              >
                ×
              </button>
            </div>
            
            {/* Contact Info Cards - Compact */}
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="text-gray-500 font-medium">Category</div>
                  <div className="mt-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedContactForDetails.category === 'frequent' ? 'bg-green-100 text-green-800' :
                      selectedContactForDetails.category === 'warm' ? 'bg-yellow-100 text-yellow-800' :
                      selectedContactForDetails.category === 'hot' ? 'bg-red-100 text-red-800' :
                      selectedContactForDetails.category === 'cold' ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedContactForDetails.category}
                    </span>
                  </div>
                </div>
                
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="text-gray-500 font-medium">Emails</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedContactForDetails.emailCount}
                  </div>
                </div>
                
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="text-gray-500 font-medium">Response Rate</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {Math.round(selectedContactForDetails.responseRate * 100)}%
                  </div>
                </div>
                
                {selectedContactForDetails.lastContactDate && (
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <div className="text-gray-500 font-medium">Last Contact</div>
                    <div className="text-xs text-gray-900 mt-1">
                      {selectedContactForDetails.lastContactDate.toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Email Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Last Email</h4>
                {lastEmailCategories && lastEmailCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {lastEmailCategories.map((cat) => (
                      <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {isLoadingLastEmail ? (
                <div className="flex items-center justify-center h-24">
                  <div className="text-gray-500 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mx-auto mb-2"></div>
                    <div className="text-xs">Loading email…</div>
                  </div>
                </div>
              ) : lastEmailHtml ? (
                <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
                  <div 
                    className="prose prose-xs max-w-none text-gray-800 leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lastEmailHtml) }} 
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-gray-500">
                  <div className="text-center">
                    <div className="text-2xl mb-1">📧</div>
                    <div className="text-xs">No email available</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer - Compact */}
            <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setSelectedContactForDetails(null)}
                className="flex-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedContactForDetails(null);
                  handleDraftEmail(selectedContactForDetails);
                }}
                className="flex-1 px-3 py-2 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-medium"
              >
                Draft Email
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

export default App;