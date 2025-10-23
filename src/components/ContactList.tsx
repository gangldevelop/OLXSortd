import type { ContactWithAnalysis } from '../types/contact';

interface ContactListProps {
  contacts: ContactWithAnalysis[];
  onDraftEmail: (contact: ContactWithAnalysis) => void;
  onViewEmail?: (contact: ContactWithAnalysis) => void;
  onSnooze?: (contact: ContactWithAnalysis, days: number) => void;
}

export function ContactList({ contacts, onDraftEmail, onViewEmail, onSnooze }: ContactListProps) {

  const getCategoryColor = (category: ContactWithAnalysis['category']) => {
    switch (category) {
      case 'frequent':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-orange-100 text-orange-800';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'hot':
        return 'bg-red-100 text-red-800';
      case 'cold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Contact Cards for Outlook Sidebar */}
      {contacts.length === 0 ? (
        <div className="bg-white rounded border p-4 text-center">
          <p className="text-sm text-gray-500">No contacts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded border p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{contact.name}</h4>
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getCategoryColor(contact.category)}`}>
                      {contact.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">{contact.email}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{contact.emailCount} emails</span>
                    <span>{Math.round(contact.responseRate * 100)}% response</span>
                    <span>
                      {contact.lastContactDate 
                        ? `${Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))}d ago`
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {onViewEmail && (
                    <button 
                      onClick={() => onViewEmail(contact)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      View
                    </button>
                  )}
                  <button 
                    onClick={() => onDraftEmail(contact)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors"
                  >
                    Draft
                  </button>
                  {onSnooze && (
                    <div className="relative">
                      <details>
                        <summary className="list-none cursor-pointer text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">Snooze ▾</summary>
                        <div className="absolute right-0 mt-1 bg-white border rounded shadow-sm z-10 text-xs">
                          <button className="block px-3 py-1 hover:bg-gray-50 w-full text-left" onClick={(e) => { e.preventDefault(); onSnooze(contact, 7); }}>7 days</button>
                          <button className="block px-3 py-1 hover:bg-gray-50 w-full text-left" onClick={(e) => { e.preventDefault(); onSnooze(contact, 14); }}>14 days</button>
                          <button className="block px-3 py-1 hover:bg-gray-50 w-full text-left" onClick={(e) => { e.preventDefault(); onSnooze(contact, 30); }}>30 days</button>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}