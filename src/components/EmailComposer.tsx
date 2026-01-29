import { useState } from 'react';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { EmailEditor } from './EmailEditor';
import { graphService } from '../services/microsoftGraph';
import { llmClient } from '../services/llmClient';
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
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<{
    subject: string;
    bodyHtml: string;
    bodyText: string;
  } | null>(null);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setAiDraft(null);
  };

  const handleCreateDraft = () => {
    if (selectedTemplate) {
      setAiDraft(null);
      setShowEditor(true);
    }
  };

  const handleGenerateWithAi = async () => {
    if (!selectedTemplate) {
      return;
    }

    setIsGeneratingWithAi(true);
    setAiError(null);

    try {
      const lastEmail = await graphService.getLastEmailWithContact(contact.email);

      if (!lastEmail) {
        setAiError('No previous email found for this contact.');
        return;
      }

      const draft = await llmClient.generateDraft({
        lastEmailHtml: lastEmail.html,
        contactName: contact.name,
        senderName,
        language: 'de',
      });

      setAiDraft({
        subject: draft.subject,
        bodyHtml: draft.bodyHtml,
        bodyText: draft.bodyText,
      });
      setShowEditor(true);
    } catch (error) {
      console.error('Failed to generate AI draft:', error);
      setAiError(
        error instanceof Error ? error.message : 'Unexpected error while generating AI draft.'
      );
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleSaveDraft = (_draft: { subject: string; body: string; htmlBody: string }) => {
    setShowEditor(false);
    setSelectedTemplate(null);
    setAiDraft(null);
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
    setAiDraft(null);
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
        <div className="flex justify-center gap-2">
          <button
            onClick={handleCreateDraft}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded transition-colors"
          >
            Create Draft
          </button>
          <button
            onClick={handleGenerateWithAi}
            disabled={isGeneratingWithAi}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white px-3 py-1 rounded transition-colors"
          >
            {isGeneratingWithAi ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      )}

      {aiError && !showEditor && (
        <p className="mt-2 text-center text-xs text-red-600">{aiError}</p>
      )}

      {showEditor && selectedTemplate && (
        <EmailEditor
          template={selectedTemplate}
          contactName={contact.name}
          contactEmail={contact.email}
          senderName={senderName}
          initialSubject={aiDraft?.subject ?? undefined}
          initialBodyText={aiDraft?.bodyText ?? undefined}
          initialHtmlBody={aiDraft?.bodyHtml ?? undefined}
          enableTemplateAutoUpdate={!aiDraft}
          onSave={handleSaveDraft}
          onSend={(e) => handleSendEmail(e)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}


