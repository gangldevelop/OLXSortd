import { useEffect, useMemo, useState } from 'react';
import { ContactSearch } from './ContactSearch';
import type { ContactWithAnalysis } from '../types/contact';
import { SNOOZE_DURATIONS } from '../types';
import { getCategoryColorClasses, getCategoryIcon } from '../utils/contactCategory';

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
    frequent: contacts.filter((c) => c.category === 'frequent').length,
    inactive: contacts.filter((c) => c.category === 'inactive').length,
    warm: contacts.filter((c) => c.category === 'warm').length,
    hot: contacts.filter((c) => c.category === 'hot').length,
    cold: contacts.filter((c) => c.category === 'cold').length,
  };

  const contactsNeedingAttention = useMemo(() => {
    return contacts
      .filter((contact) => contact.category === 'inactive' || (contact.category === 'cold' && contact.emailCount > 0))
      .sort((a, b) => {
        if (a.responseRate !== b.responseRate) {
          return b.responseRate - a.responseRate;
        }
        if (a.lastContactDate && b.lastContactDate) {
          return b.lastContactDate.getTime() - a.lastContactDate.getTime();
        }
        return 0;
      });
  }, [contacts]);

  useEffect(() => {
    setNeedsAttentionContacts(contactsNeedingAttention);
  }, [contactsNeedingAttention]);

  return (
    <div className="space-y-3">
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

      {contactsNeedingAttention.length > 0 && (
        <div className="bg-white rounded border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Needs Attention ({needsAttentionContacts.length})</h3>

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
              const getCategoryColor = getCategoryColorClasses;

              const daysSinceLastContact = contact.lastContactDate
                ? Math.floor((Date.now() - contact.lastContactDate.getTime()) / (24 * 60 * 60 * 1000))
                : null;

              return (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onShowContactDetails(contact)}
                >
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
    </div>
  );
}


