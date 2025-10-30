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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg w-full max-w-sm max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{contact.name}</h3>
            <p className="text-xs text-gray-600 truncate">{contact.email}</p>
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light hover:bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center transition-colors ml-2 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded border border-gray-200">
              <div className="text-gray-500 font-medium">Category</div>
              <div className="mt-1">
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getCategoryPillClasses(contact.category)}`}>
                  {getCategoryLabel(contact.category)}
                </span>
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-gray-200">
              <div className="text-gray-500 font-medium">Emails</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{contact.emailCount}</div>
            </div>

            <div className="bg-white p-2 rounded border border-gray-200">
              <div className="text-gray-500 font-medium">Response Rate</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{Math.round(contact.responseRate * 100)}%</div>
            </div>

            {contact.lastContactDate && (
              <div className="bg-white p-2 rounded border border-gray-200">
                <div className="text-gray-500 font-medium">Last Contact</div>
                <div className="text-xs text-gray-900 mt-1">{contact.lastContactDate.toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Last Email</h4>
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="text-gray-500 text-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <div className="text-xs">Loading email…</div>
              </div>
            </div>
          ) : html ? (
            <div className="bg-white border border-gray-200 rounded p-3 shadow-sm">
              <div
                className="prose prose-xs max-w-none text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-gray-500">
              <div className="text-center">
                <div className="text-2xl mb-1">📧</div>
                <div className="text-xs">No email available</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded hover:bg-gray-100"
          >
            Close
          </button>
          <button
            onClick={() => onDraft(contact)}
            className="flex-1 px-3 py-2 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors font-medium"
          >
            Draft Email
          </button>
        </div>
      </div>
    </div>
  );
}


