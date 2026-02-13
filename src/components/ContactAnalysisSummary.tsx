import type { ContactWithAnalysis } from '../types/contact';

interface ContactAnalysisSummaryProps {
  contacts: ContactWithAnalysis[];
  onContactSelect: (contact: ContactWithAnalysis) => void;
}

export function ContactAnalysisSummary({ contacts, onContactSelect }: ContactAnalysisSummaryProps) {
  const summary = {
    total: contacts.length,
    recent: contacts.filter(c => c.category === 'recent').length,
    in_touch: contacts.filter(c => c.category === 'in_touch').length,
    inactive: contacts.filter(c => c.category === 'inactive').length,
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'recent': // Recent
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_touch': // In Touch
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive': // Inactive
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'recent':
        return '🔥';
      case 'in_touch':
        return '🤝';
      case 'inactive':
        return '⏰';
      default:
        return '❓';
    }
  };

  const contactsNeedingAttention = contacts.filter(contact => contact.category === 'inactive');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Analysis Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-800">{summary.total}</div>
            <div className="text-sm text-slate-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{summary.recent}</div>
            <div className="text-sm text-slate-500">Recent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.in_touch}</div>
            <div className="text-sm text-slate-500">In Touch</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.inactive}</div>
            <div className="text-sm text-slate-500">Inactive</div>
          </div>
        </div>
      </div>

      {/* Contacts Needing Attention */}
      {contactsNeedingAttention.length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Contacts Needing Attention ({contactsNeedingAttention.length})
          </h3>
          
          <div className="space-y-3">
            {contactsNeedingAttention.slice(0, 5).map((contact) => (
              <div 
                key={contact.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => onContactSelect(contact)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(contact.category)}</span>
                    <h4 className="font-medium text-slate-800">{contact.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(contact.category)}`}>
                      {contact.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{contact.email}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{contact.emailCount} emails</span>
                    <span>Response rate: {Math.round(contact.responseRate * 100)}%</span>
                    <span>Confidence: {contact.analysis.score}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-800">
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
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All {contactsNeedingAttention.length} Contacts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analysis Insights */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Key Insights</h3>
        
        <div className="space-y-3">
          {summary.recent > 0 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-green-600 text-lg">🔥</span>
              <div>
                <p className="font-medium text-green-900">Recent Relationships</p>
                <p className="text-sm text-green-700">
                  {summary.recent} contacts had recent interactions. Keep nurturing these relationships.
                </p>
              </div>
            </div>
          )}
          
          {summary.in_touch > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-600 text-lg">🤝</span>
              <div>
                <p className="font-medium text-blue-900">In Touch</p>
                <p className="text-sm text-blue-700">
                  {summary.in_touch} contacts are in active conversation. Maintain momentum.
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
        </div>
      </div>
    </div>
  );
}
