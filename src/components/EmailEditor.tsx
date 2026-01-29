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
    <div className="bg-white rounded border p-3">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Email Editor</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onCancel}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded transition-colors"
          >
            Save Draft
          </button>
          <button 
            onClick={handleSend}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors"
          >
            Send Email
          </button>
        </div>
      </div>

      {/* Recipient Info */}
      <div className="mb-4 p-2 bg-gray-50 rounded">
        <div className="flex items-center">
          <div>
            <p className="text-xs font-medium text-gray-900">To: {contactName}</p>
            <p className="text-xs text-gray-500">{contactEmail}</p>
          </div>
        </div>
      </div>

      {/* Variable inputs */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        {template.variables.map((variable) => (
          <div key={variable}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {variable.charAt(0).toUpperCase() + variable.slice(1)}
            </label>
            <input
              type="text"
              value={variables[variable as keyof typeof variables]}
              onChange={(e) => handleVariableChange(variable, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
              placeholder={`Enter ${variable}`}
            />
          </div>
        ))}
      </div>

      {/* Subject */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Rich Text Body */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Message
        </label>
        <div className="border border-gray-300 rounded overflow-hidden">
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