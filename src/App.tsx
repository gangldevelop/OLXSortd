import React, { useState, useEffect } from 'react';
import { ContactList } from './components/ContactList';
import { ContactAnalysisService } from './services/contactAnalysisService';
import { mockContacts, mockEmailInteractions } from './data/mockEmailInteractions';
import type { ContactWithAnalysis } from './types/contact';

// Compact Analysis Summary Component
function AnalysisSummary({ contacts }: { contacts: ContactWithAnalysis[] }) {
  const summary = {
    total: contacts.length,
    frequent: contacts.filter(c => c.category === 'frequent').length,
    inactive: contacts.filter(c => c.category === 'inactive').length,
    cold: contacts.filter(c => c.category === 'cold').length,
  };

  const contactsNeedingAttention = contacts.filter(contact => 
    contact.category === 'inactive' || 
    (contact.category === 'cold' && contact.emailCount > 0)
  ).slice(0, 3); // Show only top 3

  return (
    <div className="space-y-3">
      {/* Quick Stats */}
      <div className="bg-white rounded border p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Analysis Summary</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">{summary.frequent}</div>
            <div className="text-xs text-gray-500">Frequent</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">{summary.inactive}</div>
            <div className="text-xs text-gray-500">Inactive</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">{summary.cold}</div>
            <div className="text-xs text-gray-500">Cold</div>
          </div>
        </div>
      </div>

      {/* Contacts Needing Attention */}
      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Needs Attention ({contactsNeedingAttention.length})
          </h3>
          <div className="space-y-2">
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
  
  const analysisService = new ContactAnalysisService();

  useEffect(() => {
    analyzeContacts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeContacts = async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const analyzedContacts = analysisService.analyzeContacts(
      mockContacts,
      mockEmailInteractions
    );
    
    setContacts(analyzedContacts);
    setIsAnalyzing(false);
  };


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
            <p className="text-xs text-gray-500">{contacts.length} contacts</p>
          </div>
          <button 
            onClick={analyzeContacts}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Main Content - Single Column for Outlook Sidebar */}
      <div className="p-4 space-y-4">
        <AnalysisSummary contacts={contacts} />
        <ContactList contacts={contacts} />
      </div>
    </div>
  );
}

export default App;