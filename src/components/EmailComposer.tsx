import { useState } from 'react';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { EmailEditor } from './EmailEditor';
import { graphService } from '../services/microsoftGraph';
import type { ContactWithAnalysis } from '../types/contact';
import type { EmailTemplate } from '../types/email';

export function EmailComposer({
  contact,
  senderName,
  onClose,
}: {
  contact: ContactWithAnalysis;
  senderName: string;
  onClose: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateDraft = () => {
    if (selectedTemplate) {
      setShowEditor(true);
    }
  };

  const handleSaveDraft = (_draft: { subject: string; body: string; htmlBody: string }) => {
    setShowEditor(false);
    setSelectedTemplate(null);
    onClose();
  };

  const handleSendEmail = async (email: { subject: string; body: string; htmlBody: string }) => {
    try {
      await graphService.sendEmail(contact.email, email.subject, email.htmlBody, true);
      alert(`Email sent to ${contact.email}!\nSubject: ${email.subject}`);
      setShowEditor(false);
      setSelectedTemplate(null);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
    onClose();
  };

  return (
    <div className="space-y-3">
      {!showEditor && (
        <EmailTemplateSelector
          key={contact.id}
          selectedCategory={contact.category}
          onTemplateSelect={handleTemplateSelect}
        />
      )}

      {selectedTemplate && !showEditor && (
        <div className="flex justify-center">
          <button
            onClick={handleCreateDraft}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors"
          >
            Create Draft
          </button>
        </div>
      )}

      {showEditor && selectedTemplate && (
        <EmailEditor
          template={selectedTemplate}
          contactName={contact.name}
          contactEmail={contact.email}
          senderName={senderName}
          onSave={handleSaveDraft}
          onSend={(e) => handleSendEmail(e)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}


