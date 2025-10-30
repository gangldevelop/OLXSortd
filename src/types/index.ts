import type { ContactCategory } from './contact';

export const CONTACT_CATEGORIES = ['recent', 'in_touch', 'inactive'] as const;
export type { ContactCategory } from './contact';

export const SNOOZE_DURATIONS = [7, 14, 30] as const;

export interface Contact {
  id: string;
  email: string;
  name: string;
  lastContactDate: Date | null;
  emailCount: number;
  responseRate: number;
  category: ContactCategory;
  isActive: boolean;
  lastEmailSubject?: string;
  tags: string[];
}


export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: ContactCategory;
  isDefault: boolean;
  variables: string[];
}

export interface EmailDraft {
  id: string;
  contactId: string;
  templateId: string;
  subject: string;
  body: string;
  status: 'draft' | 'sent' | 'scheduled';
  createdAt: Date;
  scheduledFor?: Date;
}

export interface ContactAnalysis {
  totalContacts: number;
  frequentContacts: number;
  inactiveContacts: number;
  coldContacts: number;
  averageResponseRate: number;
  lastAnalyzed: Date;
}

export interface AppState {
  contacts: Contact[];
  emailTemplates: EmailTemplate[];
  emailDrafts: EmailDraft[];
  analysis: ContactAnalysis | null;
  isLoading: boolean;
  error: string | null;
}

export interface EmailProvider {
  type: 'outlook' | 'gmail';
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  userEmail?: string;
}

export interface EmailMetadata {
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  isRead: boolean;
  isReplied: boolean;
  threadId: string;
}
