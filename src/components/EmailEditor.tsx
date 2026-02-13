import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import type { EmailTemplate } from '../types/email';
import { processTemplate } from '../data/emailTemplates';

interface EmailEditorProps {
  template: EmailTemplate;
  contactName: string;
  contactEmail: string;
  senderName: string;
  initialSubject?: string;
  initialBodyText?: string;
  initialHtmlBody?: string;
  enableTemplateAutoUpdate?: boolean;
  onSave: (draft: { subject: string; body: string; htmlBody: string }) => void;
  onSend: (email: { subject: string; body: string; htmlBody: string; to: string }) => void;
  onCancel: () => void;
  onRegenerate?: () => void | Promise<void>;
  isRegenerating?: boolean;
}

export function EmailEditor({
  template,
  contactName,
  contactEmail,
  senderName,
  initialSubject,
  initialBodyText,
  initialHtmlBody,
  enableTemplateAutoUpdate = true,
  onSave,
  onSend,
  onCancel,
  onRegenerate,
  isRegenerating = false,
}: EmailEditorProps) {
  const [variables, setVariables] = useState({
    name: contactName,
    senderName: senderName,
    company: 'Your Company',
    industry: 'Your Industry'
  });

  const [subject, setSubject] = useState(initialSubject ?? template.subject);
  const [body, setBody] = useState(initialBodyText ?? template.body);
  const [htmlBody, setHtmlBody] = useState(initialHtmlBody ?? template.body);
  const quillRef = useRef<ReactQuill>(null);

  // Quill editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'link', 'blockquote'
  ];

  // Update email content when variables change (template-based drafts only)
  React.useEffect(() => {
    if (!enableTemplateAutoUpdate) {
      return;
    }
    const processed = processTemplate(
      { ...template, subject: template.subject, body: template.body },
      variables
    );
    setSubject(processed.subject);
    setBody(processed.body);
    setHtmlBody(processed.body);
  }, [variables, template, enableTemplateAutoUpdate]);

  // Sync editor when parent updates draft (e.g. after regenerate) - AI drafts only
  React.useEffect(() => {
    if (!enableTemplateAutoUpdate) {
      if (initialSubject !== undefined) setSubject(initialSubject);
      if (initialBodyText !== undefined) setBody(initialBodyText);
      if (initialHtmlBody !== undefined) setHtmlBody(initialHtmlBody);
    }
  }, [initialSubject, initialBodyText, initialHtmlBody, enableTemplateAutoUpdate]);

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handleBodyChange = (content: string, _delta: unknown, _source: string, editor: { getText: () => string }) => {
    setHtmlBody(content);
    setBody(editor.getText()); // Get plain text version
  };

  const handleSave = () => {
    onSave({ subject, body, htmlBody });
  };

  const handleSend = () => {
    onSend({ subject, body, htmlBody, to: contactEmail });
  };

  return (
    <div className="glass-panel p-3">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-3">Email Editor</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onCancel}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn-secondary"
          >
            Save Draft
          </button>
          <button 
            onClick={handleSend}
            className="btn-primary"
          >
            Send Email
          </button>
          {onRegenerate && (
            <button
              onClick={() => onRegenerate()}
              disabled={isRegenerating}
              className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-all duration-200 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Regenerate draft from original email context"
            >
              {isRegenerating ? (
                <>
                  <span className="inline-block animate-spin mr-1">⟳</span>
                  Regenerating…
                </>
              ) : (
                <>⟳ Regenerate</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Recipient Info */}
      <div className="mb-4 p-3 bg-white/[0.03] border border-white/10 rounded-lg">
        <div className="flex items-center">
          <div>
            <p className="text-xs font-medium text-slate-200">To: {contactName}</p>
            <p className="text-xs text-slate-400">{contactEmail}</p>
          </div>
        </div>
      </div>

      {/* Variable inputs */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        {template.variables.map((variable) => (
          <div key={variable}>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {variable.charAt(0).toUpperCase() + variable.slice(1)}
            </label>
            <input
              type="text"
              value={variables[variable as keyof typeof variables]}
              onChange={(e) => handleVariableChange(variable, e.target.value)}
              className="input-glass text-xs px-2 py-1"
              placeholder={`Enter ${variable}`}
            />
          </div>
        ))}
      </div>

      {/* Subject */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-glass text-xs px-2 py-1"
        />
      </div>

      {/* Rich Text Body */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">
          Message
        </label>
        <div className="border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={htmlBody}
            onChange={handleBodyChange}
            modules={quillModules}
            formats={quillFormats}
            style={{ 
              height: '200px'
            }}
            className="quill-editor"
          />
        </div>
      </div>
    </div>
  );
}