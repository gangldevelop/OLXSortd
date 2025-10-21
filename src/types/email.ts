export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'frequent' | 'inactive' | 'cold';
  variables: string[];
}

export interface EmailDraft {
  id: string;
  contactId: string;
  templateId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent';
  createdAt: Date;
}
