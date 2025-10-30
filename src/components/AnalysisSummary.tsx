import { useEffect, useMemo, useState } from 'react';
import { ContactSearch } from './ContactSearch';
import type { ContactWithAnalysis } from '../types/contact';
import { SNOOZE_DURATIONS } from '../types';
import { getCategoryColorClasses, getCategoryIcon, getCategoryTooltip, getCategoryLabel } from '../utils/contactCategory';

export function AnalysisSummary({
  contacts,
  onCategoryClick,
  onDraftEmail,
  onShowContactDetails,
  onSnooze,
}: {
  contacts: ContactWithAnalysis[];
  onCategoryClick: (category: string | null) => void;
  onDraftEmail: (contact: ContactWithAnalysis) => void;
  onShowContactDetails: (contact: ContactWithAnalysis) => void;
  onSnooze: (contact: ContactWithAnalysis, days: number) => void;
}) {
  const [needsAttentionContacts, setNeedsAttentionContacts] = useState<ContactWithAnalysis[]>([]);
  const summary = {
    total: contacts.length,
    recent: contacts.filter((c) => c.category === 'recent').length,
    in_touch: contacts.filter((c) => c.category === 'in_touch').length,
    inactive: contacts.filter((c) => c.category === 'inactive').length,
  };

  const contactsNeedingAttention = useMemo(() => {
    const now = Date.now();
    const MIN_DAYS_SINCE_CONTACT = 30;
    const IN_TOUCH_THRESHOLD_DAYS = 60;
    
    return contacts
      .filter((contact) => !(contact.tags || []).includes('crossware'))
      .filter((contact) => {
        if (!contact.lastContactDate || contact.emailCount === 0) return false;
        
        const daysSinceLastContact = Math.floor((now - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysSinceLastContact < MIN_DAYS_SINCE_CONTACT) return false;
        
        if (contact.category === 'inactive') {
          return true;
        }
        
        if (contact.category === 'in_touch' && daysSinceLastContact >= IN_TOUCH_THRESHOLD_DAYS) {
          return true;
        }
        
        if (contact.category === 'recent' && daysSinceLastContact >= MIN_DAYS_SINCE_CONTACT) {
          return true;
        }
        
        return false;
      })
      .sort((a, b) => {
        const aDays = a.lastContactDate ? Math.floor((now - a.lastContactDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        const bDays = b.lastContactDate ? Math.floor((now - b.lastContactDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        
        if (a.responseRate !== b.responseRate) {
          return b.responseRate - a.responseRate;
        }
        
        if (a.emailCount !== b.emailCount) {
          return b.emailCount - a.emailCount;
        }
        
        return bDays - aDays;
      });
  }, [contacts]);

  const resellerContacts = useMemo(() => contacts.filter((c) => (c.tags || []).includes('reseller')), [contacts]);
  const crosswareContacts = useMemo(() => contacts.filter((c) => (c.tags || []).includes('crossware')), [contacts]);

  useEffect(() => {
    setNeedsAttentionContacts(contactsNeedingAttention);
  }, [contactsNeedingAttention]);

  return (
    <div className="space-y-2">
      <div className="bg-white rounded border p-1.5">
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
            onClick={() => onCategoryClick('recent')}
            className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            title={`${getCategoryLabel('recent')} — ${getCategoryTooltip('recent')}`}
          >
            {getCategoryLabel('recent')} ({summary.recent})
          </button>
          <button
            onClick={() => onCategoryClick('in_touch')}
            className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            title={`${getCategoryLabel('in_touch')} — ${getCategoryTooltip('in_touch')}`}
          >
            {getCategoryLabel('in_touch')} ({summary.in_touch})
          </button>
          <button
            onClick={() => onCategoryClick('inactive')}
            className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            title={`${getCategoryLabel('inactive')} — ${getCategoryTooltip('inactive')}`}
          >
            {getCategoryLabel('inactive')} ({summary.inactive})
          </button>
        </div>
      </div>

      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded border p-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Needs Attention ({needsAttentionContacts.length})</h3>

          <div className="mb-2">
            <ContactSearch
              contacts={contactsNeedingAttention}
              onFilteredContacts={setNeedsAttentionContacts}
              placeholder="Search contacts needing attention..."
              showAdvancedFilters={false}
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {needsAttentionContacts.map((contact) => {
              const getCategoryColor = getCategoryColorClasses;

              const daysSinceLastContact = contact.lastContactDate
                ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
                : null;

              return (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onShowContactDetails(contact)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getCategoryIcon(contact.category)}</span>
                      <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                      <span title={getCategoryTooltip(contact.category)} className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getCategoryColor(contact.category)}`}>
                        {getCategoryLabel(contact.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{contact.emailCount} emails</span>
                      <span>Response: {Math.round(contact.responseRate * 100)}%</span>
                      <span>{daysSinceLastContact !== null ? `${daysSinceLastContact}d ago` : 'Never contacted'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <details>
                        <summary className="list-none cursor-pointer text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
                          Snooze ▾
                        </summary>
                        <div className="absolute right-0 mt-1 bg-white border rounded shadow-sm z-10 text-xs">
                          {SNOOZE_DURATIONS.map((d) => (
                            <button
                              key={d}
                              className="block px-3 py-1 hover:bg-gray-50 w-full text-left"
                              onClick={(e) => {
                                e.preventDefault();
                                onSnooze(contact, d);
                              }}
                            >
                              {d} days
                            </button>
                          ))}
                        </div>
                      </details>
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reseller Portal Section */}
      {resellerContacts.length > 0 && (
        <div className="bg-white rounded border p-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Reseller Portal ({resellerContacts.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {resellerContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onShowContactDetails(contact)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-indigo-50 text-indigo-700 border-indigo-100">Reseller</span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{contact.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDraftEmail(contact);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded transition-colors ml-2"
                  >
                    Draft
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Crossware Customers Section */}
      {crosswareContacts.length > 0 && (
        <div className="bg-white rounded border p-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Crossware Contacts ({crosswareContacts.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {crosswareContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-1.5 bg-gray-50 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-gray-100 text-gray-700 border-gray-200">Crossware</span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">{contact.email}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}


