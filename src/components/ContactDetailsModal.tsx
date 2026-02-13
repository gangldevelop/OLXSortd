import DOMPurify from 'dompurify';
import type { ContactWithAnalysis } from '../types/contact';
import { getCategoryPillClasses, getCategoryLabel } from '../utils/contactCategory';

export function ContactDetailsModal({
  contact,
  html,
  categories,
  isLoading,
  onClose,
  onDraft,
}: {
  contact: ContactWithAnalysis;
  html: string | null;
  categories: string[] | null;
  isLoading: boolean;
  onClose: () => void;
  onDraft: (contact: ContactWithAnalysis) => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="glass-panel w-full max-w-sm max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-800 truncate">{contact.name}</h3>
            <p className="text-xs text-slate-600 truncate">{contact.email}</p>
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl font-light hover:bg-slate-200 rounded-full w-6 h-6 flex items-center justify-center transition-colors ml-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-slate-500 font-medium">Category</div>
              <div className="mt-1">
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getCategoryPillClasses(contact.category)}`}>
                  {getCategoryLabel(contact.category)}
                </span>
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-slate-500 font-medium">Emails</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">{contact.emailCount}</div>
            </div>

            <div className="bg-white p-2 rounded border border-slate-200">
              <div className="text-slate-500 font-medium">Response Rate</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">{Math.round(contact.responseRate * 100)}%</div>
            </div>

            {contact.lastContactDate && (
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="text-slate-500 font-medium">Last Contact</div>
                <div className="text-xs text-slate-800 mt-1">{contact.lastContactDate.toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Last Email</h4>
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="text-slate-600 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <div className="text-xs">Loading email…</div>
              </div>
            </div>
          ) : html ? (
            <div className="bg-white border border-slate-200 rounded p-3 shadow-sm">
              <div
                className="prose prose-sm max-w-none text-slate-800 leading-relaxed prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-900 prose-a:text-blue-600"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-slate-500">
              <div className="text-center">
                <div className="text-2xl mb-1">📧</div>
                <div className="text-xs">No email available</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 transition-colors border border-slate-300 rounded-lg hover:bg-slate-200"
          >
            Close
          </button>
          <button
            onClick={() => onDraft(contact)}
            className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Draft Email
          </button>
        </div>
      </div>
    </div>
  );
}


