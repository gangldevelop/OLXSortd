import type { EmailInteraction } from '../types/contact';

/**
 * Mock email interactions for testing contact analysis
 * Simulates realistic email communication patterns
 */
export const mockEmailInteractions: EmailInteraction[] = [
  // John Doe - Frequent contact (active communication)
  {
    id: '1',
    contactId: '1',
    subject: 'Project Update',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    direction: 'sent',
    isRead: true,
    isReplied: true,
    threadId: 'thread-1'
  },
  {
    id: '2',
    contactId: '1',
    subject: 'Re: Project Update',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    direction: 'received',
    isRead: true,
    isReplied: false,
    threadId: 'thread-1'
  },
  {
    id: '3',
    contactId: '1',
    subject: 'Meeting Notes',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    direction: 'received',
    isRead: true,
    isReplied: true,
    threadId: 'thread-2'
  },
  {
    id: '4',
    contactId: '1',
    subject: 'Re: Meeting Notes',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    direction: 'sent',
    isRead: true,
    isReplied: false,
    threadId: 'thread-2'
  },
  {
    id: '5',
    contactId: '1',
    subject: 'Contract Discussion',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    direction: 'sent',
    isRead: true,
    isReplied: true,
    threadId: 'thread-3'
  },
  {
    id: '6',
    contactId: '1',
    subject: 'Re: Contract Discussion',
    date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago
    direction: 'received',
    isRead: true,
    isReplied: false,
    threadId: 'thread-3'
  },

  // Jane Smith - Inactive contact (previously active, now quiet)
  {
    id: '7',
    contactId: '2',
    subject: 'Follow-up Meeting',
    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    direction: 'sent',
    isRead: true,
    isReplied: true,
    threadId: 'thread-4'
  },
  {
    id: '8',
    contactId: '2',
    subject: 'Re: Follow-up Meeting',
    date: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000), // 44 days ago
    direction: 'received',
    isRead: true,
    isReplied: false,
    threadId: 'thread-4'
  },
  {
    id: '9',
    contactId: '2',
    subject: 'Proposal Review',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    direction: 'received',
    isRead: true,
    isReplied: true,
    threadId: 'thread-5'
  },
  {
    id: '10',
    contactId: '2',
    subject: 'Re: Proposal Review',
    date: new Date(Date.now() - 59 * 24 * 60 * 60 * 1000), // 59 days ago
    direction: 'sent',
    isRead: true,
    isReplied: false,
    threadId: 'thread-5'
  },
  {
    id: '11',
    contactId: '2',
    subject: 'Initial Contact',
    date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    direction: 'sent',
    isRead: true,
    isReplied: true,
    threadId: 'thread-6'
  },

  // Mike Wilson - Cold contact (minimal interaction)
  {
    id: '12',
    contactId: '3',
    subject: 'Introduction',
    date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
    direction: 'sent',
    isRead: true,
    isReplied: false,
    threadId: 'thread-7'
  },
  {
    id: '13',
    contactId: '3',
    subject: 'Follow-up',
    date: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
    direction: 'sent',
    isRead: true,
    isReplied: false,
    threadId: 'thread-8'
  },

  // Additional contacts for better testing
  {
    id: '14',
    contactId: '4',
    subject: 'Weekly Check-in',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    direction: 'received',
    isRead: true,
    isReplied: true,
    threadId: 'thread-9'
  },
  {
    id: '15',
    contactId: '4',
    subject: 'Re: Weekly Check-in',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    direction: 'sent',
    isRead: true,
    isReplied: false,
    threadId: 'thread-9'
  },
  {
    id: '16',
    contactId: '4',
    subject: 'Project Status',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    direction: 'sent',
    isRead: true,
    isReplied: true,
    threadId: 'thread-10'
  }
];

/**
 * Mock contacts data
 */
export const mockContacts = [
  { id: '1', name: 'John Doe', email: 'john.doe@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com' },
  { id: '3', name: 'Mike Wilson', email: 'mike.wilson@business.org' },
  { id: '4', name: 'Sarah Johnson', email: 'sarah.johnson@techcorp.com' },
  { id: '5', name: 'David Brown', email: 'david.brown@startup.io' }
];
