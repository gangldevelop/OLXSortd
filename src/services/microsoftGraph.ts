import { MsalClient, type GraphAuthConfig } from './auth/msalClient';
import { GraphClient } from './graph/graphClient';
import { UserService } from './graph/userService';
import { MailService, type EmailMessage } from './graph/mailService';
import { ContactsService } from './graph/contactsService';

const DEBUG_GRAPH = import.meta.env.VITE_DEBUG_GRAPH === 'true';
const HISTORY_DAYS = Number(import.meta.env.VITE_HISTORY_DAYS ?? 730); // default 2 years
const GRAPH_PAGE_SIZE = Number(import.meta.env.VITE_GRAPH_PAGE_SIZE ?? 200); // Optimized: fewer API calls
const GRAPH_MAX_PAGES = Number(import.meta.env.VITE_GRAPH_MAX_PAGES ?? 20); // Optimized: 4000 emails max
const CACHE_TTL_MINUTES = 30; // Cache emails for 30 minutes

class MicrosoftGraphFacade {
  private readonly msal: MsalClient;
  private readonly graph: GraphClient;
  private readonly users: UserService;
  private readonly mail: MailService;
  private readonly contacts: ContactsService;
  private readonly lastEmailCache: Map<string, { subject: string; html: string; receivedDateTime: string; categories?: string[]; cachedAt: number }> = new Map();
  private static readonly PREVIEW_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const config: GraphAuthConfig = {
      clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
      scopes: (import.meta.env.VITE_GRAPH_SCOPES || '').split(',')
    };

    this.msal = new MsalClient(config);
    this.graph = new GraphClient(this.msal, import.meta.env.VITE_GRAPH_API_ENDPOINT);
    this.users = new UserService(this.graph);
    this.mail = new MailService(this.graph);
    this.contacts = new ContactsService(this.graph);
  }

  // Auth
  async initialize(): Promise<void> { await this.msal.initialize(); }
  async signIn() { return this.msal.signIn(); }
  async signOut(): Promise<void> { return this.msal.signOut(); }
  getCurrentAccount() { return this.msal.getCurrentAccount(); }
  async getAccessToken(): Promise<string | null> { return this.msal.getAccessToken(); }
  async debugAuthStatus(): Promise<void> { return this.msal.debugAuthStatus(); }

  // Users
  async getCurrentUser(): Promise<{ displayName: string; mail: string; id: string }> {
    return this.users.getCurrentUser();
  }

  // Mail
  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = true): Promise<void> {
    return this.mail.sendEmail(to, subject, body, isHtml);
  }

  private formatEmailForDisplay(email: any): { subject: string; html: string; receivedDateTime: string, categories?: string[] } {
    const subject = email.subject || 'No Subject';
    const receivedDateTime = email.receivedDateTime;
    let html = '';
    if (email.body && email.body.content) {
      const isHtml = (email.body.contentType || '').toLowerCase() === 'html';
      html = isHtml ? email.body.content : email.body.content.replace(/\n/g, '<br/>');
    } else {
      html = `<div class="email-preview bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p class="mb-2"><strong>Subject:</strong> ${subject}</p>
        <p class="mb-2"><strong>Date:</strong> ${new Date(receivedDateTime).toLocaleString()}</p>
        <p class="text-sm text-gray-600 mt-3"><em>Email body content is not available.</em></p>
      </div>`;
    }
    return { subject, html, receivedDateTime, categories: Array.isArray(email.categories) ? email.categories : undefined };
  }

  async getLastEmailWithContact(contactEmail: string): Promise<{ subject: string; html: string; receivedDateTime: string, categories?: string[] } | null> {
    try {
      const key = contactEmail.toLowerCase().trim();
      const cached = this.lastEmailCache.get(key);
      if (cached && Date.now() - cached.cachedAt < MicrosoftGraphFacade.PREVIEW_TTL_MS) {
        return { subject: cached.subject, html: cached.html, receivedDateTime: cached.receivedDateTime, categories: cached.categories };
      }

      const normalizedEmail = key;

      // Prefer Graph $search first to avoid brittle $filter on nested properties
      try {
        const searchQuery = `"${normalizedEmail}"`;
        const searchEndpoint = `/me/messages?$search=${encodeURIComponent(searchQuery)}&$top=3&$select=id,subject,receivedDateTime,from,toRecipients,categories,bodyPreview`;
        const searchResp = await this.graph.request<{ value?: any[] }>(searchEndpoint, 'GET', undefined, { 'ConsistencyLevel': 'eventual' });
        const hits = (searchResp.value || []).sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
        const direct = hits.find(m => {
          const fromEmail = m.from?.emailAddress?.address?.toLowerCase() || '';
          const toEmails = (m.toRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase() || '');
          return fromEmail === normalizedEmail || toEmails.includes(normalizedEmail);
        }) || hits[0];
        if (direct) {
          const body = await this.mail.getMessageBodyQuick(direct.id);
          const chosen = { ...direct, ...body };
          const preview = this.formatEmailForDisplay(chosen);
          this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
          return preview;
        }
      } catch {}

      // No search hit → fallback strategy

      // Fallback: recent emails and client-side filter
      const inbox = await this.mail.getEmailMessages('inbox', 100);
      const sent = await this.mail.getEmailMessages('sentitems', 100);
      let relevant: EmailMessage[] = [...inbox, ...sent].filter(email => {
        const fromEmail = email.from?.emailAddress?.address?.toLowerCase() || '';
        const toEmails = (email.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase() || '');
        return fromEmail === normalizedEmail || toEmails.includes(normalizedEmail);
      });
      if (relevant.length > 0) {
        relevant.sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
        let chosen: any = relevant[0];
        const full = await this.mail.getMessageBodyQuick(chosen.id);
        if (full) chosen = { ...chosen, ...full };
        const preview = this.formatEmailForDisplay(chosen);
        this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
        return preview;
      }

      return null;
    } catch (error) {
      console.error('Failed to get last email for contact:', error);
      return null;
    }
  }

  private extractThreadId(subject: string): string {
    const baseSubject = subject.replace(/^(re:|fwd?:|fw:)\s*/i, '').trim().toLowerCase();
    return baseSubject.replace(/[^a-z0-9]/g, '').substring(0, 20) || 'thread-' + Math.random().toString(36).substr(2, 9);
  }

  async getEmailInteractionsForAnalysis(limit: number = 200, useCache: boolean = true): Promise<Array<{
    id: string;
    contactId: string;
    subject: string;
    date: Date;
    direction: 'sent' | 'received';
    isRead: boolean;
    isReplied: boolean;
    threadId?: string;
  }>> {
    // Try cache first
    if (useCache) {
      try {
        const cacheKey = `olx_email_cache_${limit}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age < CACHE_TTL_MINUTES * 60 * 1000) {
            console.log(`Using cached emails (${(age / 1000 / 60).toFixed(1)} minutes old)`);
            return data.map((item: any) => ({ ...item, date: new Date(item.date) }));
          }
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    const currentUser = await this.getCurrentUser();
    const userEmail = (currentUser.mail || (currentUser as any).userPrincipalName || '').toLowerCase();
    // For comprehensive runs, fetch paginated messages since two years ago to ensure coverage
    const since = new Date();
    since.setDate(since.getDate() - HISTORY_DAYS);
    const sinceIso = since.toISOString();
    const usePaged = limit > 1000;
    const [sentEmails, receivedEmails] = await Promise.all([
      usePaged
        ? this.contacts.getEmailMessagesSince('sentitems', sinceIso, GRAPH_MAX_PAGES, GRAPH_PAGE_SIZE)
        : this.contacts.getEmailMessagesFromPeriods('sentitems', [0, 30, 90, 180, 365]),
      usePaged
        ? this.contacts.getEmailMessagesSince('inbox', sinceIso, GRAPH_MAX_PAGES, GRAPH_PAGE_SIZE)
        : this.contacts.getEmailMessagesFromPeriods('inbox', [0, 30, 90, 180, 365])
    ]);

    const interactions: Array<{
      id: string; contactId: string; subject: string; date: Date; direction: 'sent' | 'received'; isRead: boolean; isReplied: boolean; threadId?: string;
    }> = [];

    sentEmails.forEach(email => {
      (email.toRecipients || []).forEach(recipient => {
        const addr = recipient?.emailAddress?.address?.toLowerCase() || '';
        if (addr && addr !== userEmail) {
          interactions.push({
            id: email.id,
            contactId: addr,
            subject: email.subject || 'No Subject',
            date: new Date(email.sentDateTime || email.receivedDateTime || new Date().toISOString()),
            direction: 'sent',
            isRead: true,
            isReplied: false,
            threadId: this.extractThreadId(email.subject || '')
          });
        }
      });
    });

    receivedEmails.forEach(email => {
      const senderEmail = email?.from?.emailAddress?.address?.toLowerCase() || '';
      if (senderEmail && senderEmail !== userEmail) {
        interactions.push({
          id: email.id,
          contactId: senderEmail,
          subject: email.subject || 'No Subject',
          date: new Date(email.receivedDateTime || email.sentDateTime || new Date().toISOString()),
          direction: 'received',
          isRead: !!email.isRead,
          isReplied: false,
          threadId: this.extractThreadId(email.subject || '')
        });
      }
    });

    // Sort and cache the results
    const sortedInteractions = interactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (useCache) {
      try {
        const cacheKey = `olx_email_cache_${limit}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data: sortedInteractions,
          timestamp: Date.now()
        }));
        console.log(`Cached ${sortedInteractions.length} email interactions`);
      } catch (error) {
        console.warn('Cache write failed (storage full?):', error);
      }
    }

    if (DEBUG_GRAPH) console.log(`Found ${sortedInteractions.length} email interactions for analysis`);
    return sortedInteractions;
  }

  async getContactsForAnalysis(options: { maxEmails?: number; useAllEmails?: boolean; quickMode?: boolean } = {}): Promise<Array<{ id: string; name: string; email: string }>> {
    const currentUser = await this.getCurrentUser();
    const userEmail = (currentUser.mail || (currentUser as any).userPrincipalName || '').toLowerCase();
    const { maxEmails = 10000, useAllEmails = false, quickMode = false } = options;

    // Outlook contacts
    const outlookRaw = await this.contacts.getContacts();
    const outlookContacts = outlookRaw
      .map(c => {
        const addr = (c.emailAddresses?.[0]?.address || '').toLowerCase();
        return { id: addr, name: c.displayName || (addr.split('@')[0] || 'Unknown'), email: addr };
      })
      .filter(c => c.email && c.email !== userEmail);

    let sentEmails: EmailMessage[] = [];
    let receivedEmails: EmailMessage[] = [];
    if (useAllEmails) {
      // Comprehensive: fetch since HISTORY_DAYS with paging
      const since = new Date();
      since.setDate(since.getDate() - HISTORY_DAYS);
      const sinceIso = since.toISOString();
      [sentEmails, receivedEmails] = await Promise.all([
        this.contacts.getEmailMessagesSince('sentitems', sinceIso, GRAPH_MAX_PAGES, GRAPH_PAGE_SIZE),
        this.contacts.getEmailMessagesSince('inbox', sinceIso, GRAPH_MAX_PAGES, GRAPH_PAGE_SIZE)
      ]);
    } else if (quickMode) {
      [sentEmails, receivedEmails] = await Promise.all([
        this.mail.getEmailMessages('sentitems', 1000),
        this.mail.getEmailMessages('inbox', 1000)
      ]);
    } else {
      [sentEmails, receivedEmails] = await Promise.all([
        this.contacts.getEmailMessagesFromPeriods('sentitems', [0, 30, 90, 180, 365]),
        this.contacts.getEmailMessagesFromPeriods('inbox', [0, 30, 90, 180, 365])
      ]);
    }

    const emailContacts = new Map<string, { id: string; name: string; email: string }>();
    sentEmails.forEach(email => {
      (email.toRecipients || []).forEach(recipient => {
        const addr = recipient?.emailAddress?.address?.toLowerCase() || '';
        if (addr && addr !== userEmail) {
          emailContacts.set(addr, {
            id: addr,
            name: recipient?.emailAddress?.name || addr.split('@')[0],
            email: addr,
          });
        }
      });
    });

    receivedEmails.forEach(email => {
      const sender = email?.from?.emailAddress?.address?.toLowerCase() || '';
      if (sender && sender !== userEmail) {
        emailContacts.set(sender, {
          id: sender,
          name: email?.from?.emailAddress?.name || sender.split('@')[0],
          email: sender,
        });
      }
    });

    // Deduplicate across Outlook + email-derived contacts by email (lowercase)
    const allByEmail = new Map<string, { id: string; name: string; email: string }>();
    outlookContacts.forEach(c => { if (!allByEmail.has(c.email)) allByEmail.set(c.email, c); });
    emailContacts.forEach(c => { if (!allByEmail.has(c.email)) allByEmail.set(c.email, c); });
    const all: Array<{ id: string; name: string; email: string }> = Array.from(allByEmail.values());
    if (DEBUG_GRAPH) console.log(`Found ${outlookContacts.length} Outlook contacts and ${emailContacts.size} email contacts (${all.length} total)`);
    return all.slice(0, maxEmails); // safety cap
  }
}

export const graphService = new MicrosoftGraphFacade();


