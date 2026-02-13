import { useEffect, useMemo, useState } from 'react';
import type { ResellerCsvEntry } from '../utils/segmentation';
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
  resellerCsv,
}: {
  contacts: ContactWithAnalysis[];
  onCategoryClick: (category: string | null) => void;
  onDraftEmail: (contact: ContactWithAnalysis) => void;
  onShowContactDetails: (contact: ContactWithAnalysis) => void;
  onSnooze: (contact: ContactWithAnalysis, days: number) => void;
  resellerCsv?: ResellerCsvEntry[];
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
      .filter((contact) => !(contact.tags || []).includes('reseller'))
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
      <div className="glass-panel p-2">
        <h3 className="text-xs font-semibold text-slate-700 mb-2">Contact Categories</h3>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onCategoryClick(null)}
            className="px-2 py-1 rounded text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            title="Show all contacts"
          >
            All ({summary.total})
          </button>
          <button
            onClick={() => onCategoryClick('recent')}
            className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
            title={`${getCategoryLabel('recent')} — ${getCategoryTooltip('recent')}`}
          >
            {getCategoryLabel('recent')} ({summary.recent})
          </button>
          <button
            onClick={() => onCategoryClick('in_touch')}
            className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
            title={`${getCategoryLabel('in_touch')} — ${getCategoryTooltip('in_touch')}`}
          >
            {getCategoryLabel('in_touch')} ({summary.in_touch})
          </button>
          <button
            onClick={() => onCategoryClick('inactive')}
            className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title={`${getCategoryLabel('inactive')} — ${getCategoryTooltip('inactive')}`}
          >
            {getCategoryLabel('inactive')} ({summary.inactive})
          </button>
        </div>
      </div>

      {contactsNeedingAttention.length > 0 && (
        <div className="glass-panel p-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Needs Attention ({needsAttentionContacts.length})</h3>

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
                  className="flex items-start justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                  onClick={() => onShowContactDetails(contact)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{getCategoryIcon(contact.category)}</span>
                      <p className="text-xs font-medium text-slate-800 truncate">{contact.name}</p>
                      <span title={getCategoryTooltip(contact.category)} className={`px-1.5 py-0.5 text-xs font-medium rounded border ${getCategoryColor(contact.category)}`}>
                        {getCategoryLabel(contact.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{contact.emailCount} emails</span>
                      <span>Response: {Math.round(contact.responseRate * 100)}%</span>
                      <span>{daysSinceLastContact !== null ? `${daysSinceLastContact}d ago` : 'Never contacted'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <details>
                        <summary className="list-none cursor-pointer text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200">
                          Snooze ▾
                        </summary>
                        <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 text-xs">
                          {SNOOZE_DURATIONS.map((d) => (
                            <button
                              key={d}
                              className="block px-3 py-1 hover:bg-slate-100 w-full text-left text-slate-700"
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
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-100 rounded transition-colors ml-2"
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

      {/* Resellers (CSV) Section */}
      {!!(resellerCsv && resellerCsv.length) && (
        <div className="glass-panel p-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Resellers ({resellerCsv.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {resellerCsv.map((r) => (
              <div key={r.id} className="flex items-start justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-medium text-slate-800 truncate">{r.reseller}</p>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-indigo-100 text-indigo-800 border-indigo-200">Reseller</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="truncate" title={r.contact}>{r.contact}</span>
                    {r.mobile && <span>{r.mobile}</span>}
                    {r.location && <span>{r.location}</span>}
                    {r.revenue && <span>€ {r.revenue}</span>}
                  </div>
                </div>
                {r.contact && (
                  <button
                    onClick={() => {
                      const id = `reseller:${r.id}`;
                      const virtualContact: ContactWithAnalysis = {
                        id,
                        name: r.reseller || r.representative || r.contact,
                        email: r.contact,
                        category: 'inactive',
                        analysis: {
                          contactId: id,
                          category: 'inactive',
                          score: 0,
                          metrics: {
                            totalEmails: 0,
                            sentEmails: 0,
                            receivedEmails: 0,
                            responseRate: 0,
                            daysSinceLastContact: 9999,
                            averageResponseTime: 0,
                            conversationCount: 0,
                          },
                          insights: [],
                          lastAnalyzed: new Date(),
                        },
                        lastContactDate: null,
                        emailCount: 0,
                        responseRate: 0,
                        isActive: true,
                        tags: ['reseller'],
                      };
                      onDraftEmail(virtualContact);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-100 rounded transition-colors ml-2"
                  >
                    Draft
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reseller Portal Section */}
      {resellerContacts.length > 0 && (
        <div className="glass-panel p-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Reseller Portal ({resellerContacts.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {resellerContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                  onClick={() => onShowContactDetails(contact)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-slate-800 truncate">{contact.name}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-indigo-100 text-indigo-800 border-indigo-200">Reseller</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDraftEmail(contact);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-100 rounded transition-colors ml-2"
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
        <div className="glass-panel p-3">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Crossware Contacts ({crosswareContacts.length})</h3>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {crosswareContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-slate-800 truncate">{contact.name}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded border bg-slate-100 text-slate-700 border-slate-200">Crossware</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{contact.email}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}


