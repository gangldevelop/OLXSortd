export type ContactCategory = 'frequent' | 'inactive' | 'cold' | 'warm' | 'hot';

export interface EmailInteraction {
  id: string;
  contactId: string;
  subject: string;
  date: Date;
  direction: 'sent' | 'received';
  isRead: boolean;
  isReplied: boolean;
  threadId?: string;
}

export interface ContactAnalysis {
  contactId: string;
  category: ContactCategory;
  score: number; // 0-100 confidence score
  metrics: {
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    responseRate: number;
    daysSinceLastContact: number;
    averageResponseTime: number; // in hours
    conversationCount: number;
  };
  insights: string[];
  lastAnalyzed: Date;
}

export interface ContactAnalysisConfig {
  frequent: {
    minEmailsLast30Days: number;
    maxDaysSinceLastContact: number;
    minResponseRate: number;
  };
  inactive: {
    minDaysSinceLastContact: number;
    maxDaysSinceLastContact: number;
    minPreviousEmails: number;
  };
  cold: {
    maxEmailsTotal: number;
    maxDaysSinceLastContact: number;
  };
}

export interface ContactWithAnalysis {
  id: string;
  name: string;
  email: string;
  category: ContactCategory;
  analysis: ContactAnalysis;
  lastContactDate: Date | null;
  emailCount: number;
  responseRate: number;
  isActive: boolean;
  lastEmailSubject?: string;
  tags: string[];
}
