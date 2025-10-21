import type { ContactWithAnalysis } from '../types/contact';

interface ContactListProps {
  contacts: ContactWithAnalysis[];
  onDraftEmail: (contact: ContactWithAnalysis) => void;
}

export function ContactList({ contacts, onDraftEmail }: ContactListProps) {

  const getCategoryColor = (category: ContactWithAnalysis['category']) => {
    switch (category) {
      case 'frequent':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-orange-100 text-orange-800';
      case 'cold':
        return 'bg-gray-100 text-gray-800';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800';
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
                <button 
                  onClick={() => onDraftEmail(contact)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors"
                >
                  Draft
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}