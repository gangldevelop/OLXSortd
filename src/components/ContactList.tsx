import type { ContactWithAnalysis } from '../types/contact';
import { getCategoryTooltip, getCategoryLabel } from '../utils/contactCategory';

interface ContactListProps {
  contacts: ContactWithAnalysis[];
  onDraftEmail: (contact: ContactWithAnalysis) => void;
  onViewEmail?: (contact: ContactWithAnalysis) => void;
  onSnooze?: (contact: ContactWithAnalysis, days: number) => void;
}

export function ContactList({ contacts, onDraftEmail, onViewEmail, onSnooze }: ContactListProps) {

  const getCategoryColor = (category: ContactWithAnalysis['category']) => {
    switch (category) {
      case 'recent':
        return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/25';
      case 'in_touch':
        return 'bg-blue-500/20 text-blue-200 border border-blue-500/30';
      case 'inactive':
        return 'bg-slate-500/20 text-slate-200 border border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-200 border border-slate-500/30';
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Contact Cards for Outlook Sidebar */}
      {contacts.length === 0 ? (
        <div className="glass-panel-muted p-4 text-center">
          <p className="text-sm text-slate-400">No contacts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="glass-panel-muted p-3 hover:bg-white/[0.08] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-100 text-sm truncate">{contact.name}</h4>
                    <span title={getCategoryTooltip(contact.category)} className={`px-1.5 py-0.5 text-xs font-medium rounded ${getCategoryColor(contact.category)}`}>
                      {getCategoryLabel(contact.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mb-1">{contact.email}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
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
                      className="text-xs text-blue-300 hover:text-blue-200 font-medium px-2 py-1 hover:bg-blue-500/15 rounded transition-colors"
                    >
                      View
                    </button>
                  )}
                  <button 
                    onClick={() => onDraftEmail(contact)}
                    className="text-xs text-blue-300 hover:text-blue-200 font-medium px-2 py-1 hover:bg-blue-500/15 rounded transition-colors"
                  >
                    Draft
                  </button>
                  {onSnooze && (
                    <div className="relative">
                      <details>
                        <summary className="list-none cursor-pointer text-xs text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10">Snooze ▾</summary>
                        <div className="absolute right-0 mt-1 bg-slate-900 border border-white/10 rounded shadow-sm z-10 text-xs">
                          <button className="block px-3 py-1 hover:bg-white/10 w-full text-left text-slate-200" onClick={(e) => { e.preventDefault(); onSnooze(contact, 7); }}>7 days</button>
                          <button className="block px-3 py-1 hover:bg-white/10 w-full text-left text-slate-200" onClick={(e) => { e.preventDefault(); onSnooze(contact, 14); }}>14 days</button>
                          <button className="block px-3 py-1 hover:bg-white/10 w-full text-left text-slate-200" onClick={(e) => { e.preventDefault(); onSnooze(contact, 30); }}>30 days</button>
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