import { create } from 'zustand';
import { Contact, EmailTemplate, EmailDraft, ContactAnalysis, AppState } from '@/types';
import { defaultEmailTemplates } from '@/services/email-templates';

interface AppStore extends AppState {
  // Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  
  setEmailTemplates: (templates: EmailTemplate[]) => void;
  addEmailTemplate: (template: EmailTemplate) => void;
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  
  setEmailDrafts: (drafts: EmailDraft[]) => void;
  addEmailDraft: (draft: EmailDraft) => void;
  updateEmailDraft: (id: string, updates: Partial<EmailDraft>) => void;
  deleteEmailDraft: (id: string) => void;
  
  setAnalysis: (analysis: ContactAnalysis) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed values
  getContactsByCategory: (category: Contact['category']) => Contact[];
  getInactiveContacts: () => Contact[];
  getFrequentContacts: () => Contact[];
  getColdContacts: () => Contact[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  contacts: [],
  emailTemplates: defaultEmailTemplates,
  emailDrafts: [],
  analysis: null,
  isLoading: false,
  error: null,

  // Actions
  setContacts: (contacts) => set({ contacts }),
  
  addContact: (contact) => set((state) => ({
    contacts: [...state.contacts, contact]
  })),
  
  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map(contact =>
      contact.id === id ? { ...contact, ...updates } : contact
    )
  })),
  
  deleteContact: (id) => set((state) => ({
    contacts: state.contacts.filter(contact => contact.id !== id)
  })),

  setEmailTemplates: (emailTemplates) => set({ emailTemplates }),
  
  addEmailTemplate: (template) => set((state) => ({
    emailTemplates: [...state.emailTemplates, template]
  })),
  
  updateEmailTemplate: (id, updates) => set((state) => ({
    emailTemplates: state.emailTemplates.map(template =>
      template.id === id ? { ...template, ...updates } : template
    )
  })),

  setEmailDrafts: (emailDrafts) => set({ emailDrafts }),
  
  addEmailDraft: (draft) => set((state) => ({
    emailDrafts: [...state.emailDrafts, draft]
  })),
  
  updateEmailDraft: (id, updates) => set((state) => ({
    emailDrafts: state.emailDrafts.map(draft =>
      draft.id === id ? { ...draft, ...updates } : draft
    )
  })),
  
  deleteEmailDraft: (id) => set((state) => ({
    emailDrafts: state.emailDrafts.filter(draft => draft.id !== id)
  })),

  setAnalysis: (analysis) => set({ analysis }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Computed values
  getContactsByCategory: (category) => {
    return get().contacts.filter(contact => contact.category === category);
  },
  
  getInactiveContacts: () => {
    return get().contacts.filter(contact => contact.category === 'inactive');
  },
  
  getFrequentContacts: () => {
    return get().contacts.filter(contact => contact.category === 'frequent');
  },
  
  getColdContacts: () => {
    return get().contacts.filter(contact => contact.category === 'cold');
  },
}));
