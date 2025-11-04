import { useState, useEffect, useRef } from 'react';
import { ContactList } from './components/ContactList';
import { ContactSearch } from './components/ContactSearch';
import { AnalysisSummary } from './components/AnalysisSummary';
import { Authentication } from './components/Authentication';
// handled within EmailComposer
import { ProgressBar } from './components/ProgressBar';
import { ContactDetailsModal } from './components/ContactDetailsModal';
import { EmailComposer } from './components/EmailComposer';
import { LayoutShell } from './components/LayoutShell';
import { graphService } from './services/microsoftGraph';
import { useContactsFilter } from './hooks/useContactsFilter';
import { useContactAnalysis } from './hooks/useContactAnalysis';
import type { ContactWithAnalysis, ContactCategory } from './types/contact';
import { getCategoryLabel } from './utils/contactCategory';
import { loadResellerDataIntoLocalStorage, extractResellersFromCsv, type ResellerCsvEntry } from './utils/segmentation';
// email templates handled inside EmailComposer
// progress handled by useContactAnalysis

// extracted to components/AnalysisSummary

function App() {
  const [contacts, setContacts] = useState<ContactWithAnalysis[]>([]);
  const [resellers, setResellers] = useState<ResellerCsvEntry[]>([]);
  // isAnalyzing handled by useContactAnalysis
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ displayName: string; mail: string; id: string } | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactWithAnalysis | null>(null);
  // template selection handled by EmailComposer
  // progress handled by useContactAnalysis
  const [selectedContactForDetails, setSelectedContactForDetails] = useState<ContactWithAnalysis | null>(null);
  const [lastEmailHtml, setLastEmailHtml] = useState<string | null>(null);
  const [isLoadingLastEmail, setIsLoadingLastEmail] = useState(false);
  const [lastEmailCategories, setLastEmailCategories] = useState<string[] | null>(null);
  
  const {
    selectedCategory,
    filteredContacts,
    setFilteredContacts,
    visibleContacts,
    baseContacts,
    handleCategoryClick,
    handleSnoozeContact,
  } = useContactsFilter(contacts);
  
  const emailTemplatesRef = useRef<HTMLDivElement>(null);
  const { analyzeContacts, isAnalyzing, progress } = useContactAnalysis(setContacts);

  useEffect(() => {
    const loadResellerData = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL;
        const response = await fetch(`${baseUrl}resellerContacts.csv`);
        const csvText = await response.text();
        console.log('Fetched CSV response:', response.status, response.statusText);
        console.log('CSV text length:', csvText.length);
        console.log('First 500 chars:', csvText.substring(0, 500));
        loadResellerDataIntoLocalStorage(csvText);
        const parsed = extractResellersFromCsv(csvText);
        console.log('Parsed reseller entries:', parsed.length);
        setResellers(parsed);
      } catch (error) {
        console.warn('Failed to load reseller contacts CSV:', error);
      }
    };
    loadResellerData();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      analyzeContacts();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // progress updates handled by hook

  // isAnalyzing state handled by hook

  const handleAuthenticated = async (userInfo: { displayName: string; mail: string; id: string }) => {
    setUser(userInfo);
    setIsAuthenticated(true);

    // Ensure MSAL is initialized after authentication
    try {
      await graphService.initialize();
    } catch (error) {
      console.error('Failed to initialize MSAL in App component:', error);
    }
  };

  const handleDraftEmail = (contact: ContactWithAnalysis) => {
    setSelectedContact(contact);
    
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

  // email composition handled by EmailComposer

  const handleCategoryClickLocal = (category: string | null) => {
    handleCategoryClick(category);
    setSelectedContact(null);
  };

  // filtering and snoozing handled by useContactsFilter

  // analyzeContacts now provided by useContactAnalysis


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
    <>
    <LayoutShell
      title="OLXSortd"
      subtitle={<span>{user?.displayName} • {contacts.length} contacts</span>}
      right={
        <>
          <button
            onClick={() => analyzeContacts('quick')}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
            disabled={isAnalyzing}
            title="Quick analysis (~30s) - Recent contacts only"
          >
            {isAnalyzing ? 'Analyzing...' : 'Quick'}
          </button>
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
        </>
      }
    >
            <AnalysisSummary
              contacts={contacts}
              onCategoryClick={handleCategoryClickLocal}
              onDraftEmail={handleDraftEmail}
              onShowContactDetails={handleShowContactDetails}
              onSnooze={handleSnoozeContact}
              resellerCsv={resellers}
            />
            
            {/* Category Filter Indicator */}
            {selectedCategory && (
              <div className="bg-blue-50 border border-blue-200 rounded p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Showing {getCategoryLabel(selectedCategory as ContactCategory)} contacts ({filteredContacts.length} of {baseContacts.length})
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
              <div className="bg-white rounded border p-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {selectedCategory ? `${getCategoryLabel(selectedCategory as ContactCategory)} Contacts` : 'All Contacts'} ({filteredContacts.length})
                </h3>
                
                {/* Search and Filter Controls */}
                <div className="mb-2">
                  <ContactSearch 
                    contacts={visibleContacts}
                    onFilteredContacts={setFilteredContacts}
                    placeholder={`Search ${selectedCategory ? getCategoryLabel(selectedCategory as ContactCategory) : 'all'} contacts...`}
                    showAdvancedFilters={true}
                  />
                </div>
                
                <div className="h-full max-h-80 overflow-y-auto">
                  <ContactList contacts={filteredContacts} onDraftEmail={handleDraftEmail} onViewEmail={handleShowContactDetails} onSnooze={handleSnoozeContact} />
                </div>
              </div>
            </div>

            {/* Email Templates/Composer Section */}
            <div ref={emailTemplatesRef} className="space-y-2">
              {selectedContact && (
                <EmailComposer
                  contact={selectedContact}
                  senderName={user?.displayName || 'Your Name'}
                  onClose={() => {
                    setSelectedContact(null);
                  }}
                />
              )}
            </div>
    </LayoutShell>
      {selectedContactForDetails && (
        <ContactDetailsModal
          contact={selectedContactForDetails!}
          html={lastEmailHtml}
          categories={lastEmailCategories}
          isLoading={isLoadingLastEmail}
          onClose={() => setSelectedContactForDetails(null)}
          onDraft={(c) => {
            setSelectedContactForDetails(null);
            handleDraftEmail(c);
          }}
        />
      )}
    </>
  );
}

export default App;