import React from 'react';
import type { ContactWithAnalysis } from '../types/contact';

interface ContactAnalysisSummaryProps {
  contacts: ContactWithAnalysis[];
  onContactSelect: (contact: ContactWithAnalysis) => void;
}

export function ContactAnalysisSummary({ contacts, onContactSelect }: ContactAnalysisSummaryProps) {
  const summary = {
    total: contacts.length,
    frequent: contacts.filter(c => c.category === 'frequent').length,
    inactive: contacts.filter(c => c.category === 'inactive').length,
    cold: contacts.filter(c => c.category === 'cold').length,
    warm: contacts.filter(c => c.category === 'warm').length,
  };

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

  const contactsNeedingAttention = contacts.filter(contact => 
    contact.category === 'inactive' || 
    (contact.category === 'cold' && contact.emailCount > 0)
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Analysis Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.frequent}</div>
            <div className="text-sm text-gray-600">Frequent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.inactive}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{summary.cold}</div>
            <div className="text-sm text-gray-600">Cold</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.warm}</div>
            <div className="text-sm text-gray-600">Warm</div>
          </div>
        </div>
      </div>

      {/* Contacts Needing Attention */}
      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contacts Needing Attention ({contactsNeedingAttention.length})
          </h3>
          
          <div className="space-y-3">
            {contactsNeedingAttention.slice(0, 5).map((contact) => (
              <div 
                key={contact.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onContactSelect(contact)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(contact.category)}</span>
                    <h4 className="font-medium text-gray-900">{contact.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(contact.category)}`}>
                      {contact.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                    <span>{contact.emailCount} emails</span>
                    <span>Response rate: {Math.round(contact.responseRate * 100)}%</span>
                    <span>Confidence: {contact.analysis.score}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {contact.lastContactDate 
                      ? `${Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))} days ago`
                      : 'Never contacted'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {contactsNeedingAttention.length > 5 && (
            <div className="mt-4 text-center">
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View All {contactsNeedingAttention.length} Contacts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analysis Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        
        <div className="space-y-3">
          {summary.frequent > 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 text-lg">🔥</span>
              <div>
                <p className="font-medium text-green-900">Active Relationships</p>
                <p className="text-sm text-green-700">
                  {summary.frequent} contacts are actively engaged. Keep nurturing these relationships.
                </p>
              </div>
            </div>
          )}
          
          {summary.inactive > 0 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-orange-600 text-lg">⏰</span>
              <div>
                <p className="font-medium text-orange-900">Reconnect Opportunities</p>
                <p className="text-sm text-orange-700">
                  {summary.inactive} contacts have gone quiet. Consider reaching out to rekindle these relationships.
                </p>
              </div>
            </div>
          )}
          
          {summary.cold > 0 && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 text-lg">❄️</span>
              <div>
                <p className="font-medium text-gray-900">Cold Outreach Potential</p>
                <p className="text-sm text-gray-700">
                  {summary.cold} contacts have minimal interaction. Perfect for cold outreach campaigns.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
