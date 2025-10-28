import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthenticationResult, AccountInfo } from '@azure/msal-browser';

const DEBUG_GRAPH = import.meta.env.VITE_DEBUG_GRAPH === 'true';

interface GraphApiConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

interface EmailContact {
  id: string;
  displayName: string;
  emailAddresses: Array<{
    address: string;
    name?: string;
  }>;
}

interface EmailMessage {
  id: string;
  subject: string;
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
  from: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
}

export class MicrosoftGraphService {
  private msalInstance: PublicClientApplication;
  private config: GraphApiConfig;
  private lastEmailCache: Map<string, { subject: string; html: string; receivedDateTime: string; categories?: string[]; cachedAt: number }> = new Map();
  private static readonly PREVIEW_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private isOutlookHost: boolean = false;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
      scopes: (import.meta.env.VITE_GRAPH_SCOPES || '').split(',')
    };

    // Debug logging
    if (DEBUG_GRAPH) {
      console.log('MSAL Configuration:', {
        clientId: this.config.clientId,
        authority: this.config.authority,
        redirectUri: this.config.redirectUri,
        scopes: this.config.scopes
      });
    }

    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority,
        redirectUri: this.config.redirectUri,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    });

    // Detect Outlook host if Office.js is available
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = typeof window !== 'undefined' ? window : undefined;
      this.isOutlookHost = !!(w && w.Office && w.Office.context && w.Office.context.mailbox);
      if (DEBUG_GRAPH) console.log('Detected Outlook host:', this.isOutlookHost);
    } catch {}
  }

  /**
   * Initialize MSAL and check for existing accounts
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      if (DEBUG_GRAPH) console.log('MSAL initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      throw error;
    }
  }

  /**
   * Attempt silent SSO when running inside Outlook add-in using mailbox user as login hint.
   * Returns true if a token is acquired silently and an account is cached.
   */
  async tryOutlookAutoSignIn(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (!this.isOutlookHost) {
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w: any = window as any;
      const mailbox = w?.Office?.context?.mailbox;
      const userEmail: string | undefined = mailbox?.userProfile?.emailAddress;

      if (!userEmail) {
        if (DEBUG_GRAPH) console.log('Outlook mailbox user email not available for SSO');
        return false;
      }

      // If we already have an account, acquire token silently with that
      const existing = this.msalInstance.getAllAccounts();
      if (existing.length > 0) {
        try {
          await this.msalInstance.acquireTokenSilent({
            scopes: this.config.scopes,
            account: existing[0],
          });
          if (DEBUG_GRAPH) console.log('Silent token acquired using existing account');
          return true;
        } catch {}
      }

      // Otherwise, attempt silent token acquisition with loginHint (no popup)
      try {
        const result = await this.msalInstance.acquireTokenSilent({
          scopes: this.config.scopes,
          loginHint: userEmail,
        } as never);
        if (DEBUG_GRAPH) console.log('Silent token acquired via loginHint for', userEmail);
        return !!result?.accessToken;
      } catch (silentErr) {
        if (DEBUG_GRAPH) console.log('Silent login with loginHint failed:', silentErr);
        return false;
      }
    } catch (e) {
      if (DEBUG_GRAPH) console.log('tryOutlookAutoSignIn encountered error:', e);
      return false;
    }
  }

  /**
   * Sign in user and get access token
   */
  async signIn(): Promise<AuthenticationResult | null> {
    try {
      // Ensure MSAL is initialized before signing in
      await this.ensureInitialized();

      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account' as const,
      };

      const response = await this.msalInstance.loginPopup(loginRequest);
      if (DEBUG_GRAPH) console.log('User signed in successfully');
      return response;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await this.msalInstance.logoutPopup({
          account: accounts[0],
        });
        if (DEBUG_GRAPH) console.log('User signed out successfully');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current user account
   */
  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  /**
   * Debug method to check authentication status
   */
  async debugAuthStatus(): Promise<void> {
    if (!DEBUG_GRAPH) return;
    console.log('=== AUTH DEBUG INFO ===');
    console.log('MSAL Instance initialized:', !!this.msalInstance);
    console.log('Config:', this.config);

    const accounts = this.msalInstance.getAllAccounts();
    console.log('Accounts found:', accounts.length);

    if (accounts.length > 0) {
      console.log('Current account:', accounts[0].username);

      try {
        const token = await this.getAccessToken();
        console.log('Access token available:', !!token);
        if (token) {
          console.log('Token length:', token.length);
        }
      } catch (error) {
        console.log('Token acquisition failed:', error);
      }
    }
    console.log('=== END AUTH DEBUG ===');
  }

  /**
   * Ensure MSAL is initialized before making API calls
   */
  private async ensureInitialized(): Promise<void> {
    try {
      // Check if already initialized by trying to access accounts
      // If this throws an error, we need to initialize
      this.msalInstance.getAllAccounts();
    } catch (error) {
      if (error instanceof Error && error.message.includes('uninitialized_public_client_application')) {
        if (DEBUG_GRAPH) console.log('MSAL not initialized, initializing now...');
        await this.initialize();
      } else {
        throw error;
      }
    }
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      // Ensure MSAL is initialized before making any API calls
      await this.ensureInitialized();

      const accounts = this.msalInstance.getAllAccounts();
      if (DEBUG_GRAPH) console.log(`Found ${accounts.length} accounts`);

      if (accounts.length === 0) {
        if (DEBUG_GRAPH) console.log('No accounts found, user needs to sign in');
        return null;
      }

      const silentRequest = {
        scopes: this.config.scopes,
        account: accounts[0],
      };

      if (DEBUG_GRAPH) console.log('Attempting to acquire token silently...');
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      if (DEBUG_GRAPH) console.log('Token acquired successfully');
      return response.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      // Try interactive login if silent fails
      try {
        if (DEBUG_GRAPH) console.log('Attempting interactive login...');
        const response = await this.signIn();
        return response?.accessToken || null;
      } catch (loginError) {
        console.error('Interactive login failed:', loginError);
        return null;
      }
    }
  }

  /**
   * Make authenticated API call to Microsoft Graph
   */
  private async makeGraphApiCall<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const url = `${import.meta.env.VITE_GRAPH_API_ENDPOINT}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    } as Record<string, string>;

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const maxRetries = 5;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429 || response.status === 503 || response.status === 504) {
          const retryAfter = Number(response.headers.get('Retry-After')) || Math.min(1000 * Math.pow(2, attempt), 10000);
          if (DEBUG_GRAPH) console.warn(`Graph throttled (${response.status}). Retrying in ${retryAfter}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, retryAfter));
          attempt++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Graph API call failed: ${response.status} ${response.statusText}`);
        }

        const status = response.status;
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type') || '';
        const hasBody = contentLength === null || contentLength === undefined || contentLength === '' || Number(contentLength) > 0;

        if (status === 202 || status === 204 || !hasBody) {
          return undefined as unknown as T;
        }

        if (contentType.includes('application/json')) {
          return (await response.json()) as T;
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          console.error('Graph API call failed:', error);
          throw error;
        }
        const backoff = Math.min(500 * Math.pow(2, attempt), 5000);
        if (DEBUG_GRAPH) console.warn(`Graph call error. Retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Graph API call failed');
  }


  /**
   * Fetch only essential fields for a message body quickly
   */
  private async getMessageBodyQuick(messageId: string): Promise<{ id: string; subject?: string; receivedDateTime?: string; body?: { content: string; contentType: 'text' | 'html' } } | null> {
    try {
      const safeId = encodeURIComponent(messageId);
      const endpoint = `/me/messages/${safeId}?$select=id,subject,receivedDateTime,body`;
      const msg = await this.makeGraphApiCall<any>(endpoint, 'GET', undefined, {
        Prefer: 'outlook.body-content-type="html"'
      });
      return msg || null;
    } catch (e) {
      if (DEBUG_GRAPH) console.log('getMessageBodyQuick failed:', e);
      return null;
    }
  }

  /**
   * Get user's contacts
   */
  async getContacts(): Promise<EmailContact[]> {
    try {
      const response = await this.makeGraphApiCall<{ value: EmailContact[] }>(
        '/me/contacts?$select=id,displayName,emailAddresses'
      );
      return response.value;
    } catch (error) {
      console.error('Failed to get contacts:', error);
      throw error;
    }
  }

  /**
   * Get user's email messages
   */
  async getEmailMessages(folder: 'inbox' | 'sentitems' = 'inbox', limit: number = 50): Promise<EmailMessage[]> {
    try {
      const response = await this.makeGraphApiCall<{ value: EmailMessage[] }>(
        `/me/mailFolders/${folder}/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,isRead`
      );
      return response.value;
    } catch (error) {
      console.error('Failed to get email messages:', error);
      throw error;
    }
  }

  /**
   * Get the most recent email (subject + HTML body) exchanged with a contact
   * Uses client-side filtering since Graph API filtering appears to be restricted
   */
  async getLastEmailWithContact(contactEmail: string): Promise<{ subject: string; html: string; receivedDateTime: string, categories?: string[] } | null> {
    try {
      // Cache check
      const key = contactEmail.toLowerCase().trim();
      const cached = this.lastEmailCache.get(key);
      if (cached && Date.now() - cached.cachedAt < MicrosoftGraphService.PREVIEW_TTL_MS) {
        if (DEBUG_GRAPH) console.log('Using cached last email preview for', key);
        return { subject: cached.subject, html: cached.html, receivedDateTime: cached.receivedDateTime, categories: cached.categories };
      }

      console.log('Getting last email for contact:', contactEmail);
      const normalizedEmail = contactEmail.toLowerCase().trim();

      // Fastest path: direct filter for from/to address (if tenant allows)
      try {
        const filter = `(from/emailAddress/address eq '${normalizedEmail}' or toRecipients/any(r:r/emailAddress/address eq '${normalizedEmail}'))`;
        const filterEndpoint = `/me/messages?$top=1&$orderby=receivedDateTime desc&$filter=${encodeURIComponent(filter)}&$select=id,subject,receivedDateTime,from,toRecipients,categories`;
        const filtered = await this.makeGraphApiCall<{ value?: any[] }>(filterEndpoint, 'GET', undefined, { 'ConsistencyLevel': 'eventual' });
        const hit = (filtered.value || [])[0];
        if (hit) {
          const body = await this.getMessageBodyQuick(hit.id);
          const chosen = { ...hit, ...body };
          const preview = this.formatEmailForDisplay(chosen);
          this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
          return preview;
        }
      } catch (e) {
        if (DEBUG_GRAPH) console.log('Direct filter path failed, falling back to search:', e);
      }

      // Fast path: Graph $search to find recent messages referencing the address
      // Requires header: ConsistencyLevel: eventual
      try {
        const searchQuery = `"${normalizedEmail}"`;
        const searchEndpoint = `/me/messages?$search=${encodeURIComponent(searchQuery)}&$top=5&$select=id,subject,receivedDateTime,from,toRecipients,categories,bodyPreview`;
        const searchResp = await this.makeGraphApiCall<{ value?: any[] }>(searchEndpoint, 'GET', undefined, { 'ConsistencyLevel': 'eventual' });
        const hits = (searchResp.value || []).sort((a, b) => new Date(b.receivedDateTime).getTime() - new Date(a.receivedDateTime).getTime());
        const direct = hits.find(m => {
          const fromEmail = m.from?.emailAddress?.address?.toLowerCase() || '';
          const toEmails = (m.toRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase() || '');
          return fromEmail === normalizedEmail || toEmails.includes(normalizedEmail);
        }) || hits[0];
        if (direct) {
          // Fetch body quickly for preview
          const body = await this.getMessageBodyQuick(direct.id);
          const chosen = { ...direct, ...body };
          const preview = this.formatEmailForDisplay(chosen);
          this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
          return preview;
        }
      } catch (e) {
        if (DEBUG_GRAPH) console.log('Search fast path failed, falling back:', e);
      }

      // Fetch recent emails without filtering (since $filter queries return 400)
      // We'll filter client-side instead
      const recentEmails = await this.getRecentEmailsForClientFiltering();
      
      // Find emails that involve this contact
      let relevantEmails = recentEmails.filter(email => {
        const fromEmail = email.from?.emailAddress?.address?.toLowerCase() || '';
        const toEmails = (email.toRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase() || '');
        
        return fromEmail === normalizedEmail || toEmails.includes(normalizedEmail);
      });

      if (relevantEmails.length > 0) {
        // Sort by most recent
        relevantEmails.sort((a, b) => {
          const dateA = new Date(a.receivedDateTime).getTime();
          const dateB = new Date(b.receivedDateTime).getTime();
          return dateB - dateA;
        });

        let chosen = relevantEmails[0];
        console.log('Categories on chosen recent email:', Array.isArray(chosen?.categories) ? chosen.categories : 'none');

        // Fetch body quickly for preview
        try {
          const full = await this.getMessageBodyQuick(chosen.id);
          if (full) {
            chosen = { ...chosen, ...full };
          }
        } catch {}
        const preview = this.formatEmailForDisplay(chosen);
        this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
        return preview;
      }

      // Fallback: paginate older messages until a match is found or safety limit reached
      console.log('No emails in first 200. Falling back to paginated search...');
      let match = await this.findEmailWithContactPaginated(normalizedEmail, 1000);
      if (match) {
        console.log('Categories on chosen paged email:', Array.isArray(match?.categories) ? match.categories : 'none');
        // Fetch body quickly for preview
        try {
          const full = await this.getMessageBodyQuick(match.id);
          if (full) {
            match = { ...match, ...full };
          }
        } catch (e) {
          if (DEBUG_GRAPH) console.log('Fallback fetch by id (paged) failed:', e);
        }
        const preview = this.formatEmailForDisplay(match);
        this.lastEmailCache.set(key, { ...preview, cachedAt: Date.now() });
        return preview;
      }

      console.log('No emails found for contact:', contactEmail);
      return null;
    } catch (error) {
      console.error('Failed to get last email for contact:', error);
      return null;
    }
  }

  /**
   * Paginate through messages (inbox + sent) and search client-side for a contact
   * safetyLimit caps total messages scanned per folder to avoid excessive calls
   */
  private async findEmailWithContactPaginated(normalizedEmail: string, safetyLimit: number = 1000): Promise<any | null> {
    // We will iterate over both inbox and sent in parallel pages: 50 per request
    const pageSize = 50;

    const buildEndpoint = (folder: 'inbox' | 'sentitems', skip: number) =>
      folder === 'inbox'
        ? `/me/messages?$skip=${skip}&$top=${pageSize}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,categories`
        : `/me/mailFolders/sentitems/messages?$skip=${skip}&$top=${pageSize}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,categories`;

    for (let scanned = 0; scanned < safetyLimit; scanned += pageSize) {
      try {
        const [inboxPage, sentPage] = await Promise.all([
          this.makeGraphApiCall<{ value: any[] }>(buildEndpoint('inbox', scanned)).catch(() => ({ value: [] })),
          this.makeGraphApiCall<{ value: any[] }>(buildEndpoint('sentitems', scanned)).catch(() => ({ value: [] }))
        ]);

        const batch = [...(inboxPage.value || []), ...(sentPage.value || [])];
        if (DEBUG_GRAPH) console.log(`Paged search scanned=${scanned + pageSize}, batch size=${batch.length}`);
        if (batch.length === 0) {
          // No more messages
          break;
        }

        const found = batch.find(email => {
          const fromEmail = email.from?.emailAddress?.address?.toLowerCase() || '';
          const toEmails = (email.toRecipients || []).map((r: any) => r.emailAddress?.address?.toLowerCase() || '');
          return fromEmail === normalizedEmail || toEmails.includes(normalizedEmail);
        });

        if (found) {
          if (DEBUG_GRAPH) console.log(`Found match in paginated search after scanning ${scanned + pageSize} messages.`);
          return found;
        }
      } catch (err) {
        if (DEBUG_GRAPH) console.log('Paginated search page failed, continuing:', err);
      }
    }

    return null;
  }

  /**
   * Get recent emails without filtering for client-side processing
   */
  private async getRecentEmailsForClientFiltering(): Promise<any[]> {
    try {
      // Fetch recent emails from inbox and sent items
      // Try to include body content - if it works with current permissions, great!
      // If not, we'll just get metadata
      const inboxEndpoint = `/me/messages?$top=100&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,body,categories`;
      const sentEndpoint = `/me/mailFolders/sentitems/messages?$top=100&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,body,categories`;

      if (DEBUG_GRAPH) console.log('Fetching recent emails for client-side filtering...');

      const [inboxResponse, sentResponse] = await Promise.all([
        this.makeGraphApiCall<{ value: any[] }>(inboxEndpoint).catch(() => ({ value: [] })),
        this.makeGraphApiCall<{ value: any[] }>(sentEndpoint).catch(() => ({ value: [] }))
      ]);

      const allEmails = [...(inboxResponse.value || []), ...(sentResponse.value || [])];
      if (DEBUG_GRAPH) console.log(`Fetched ${allEmails.length} recent emails for filtering`);
      
      return allEmails;
    } catch (error) {
      console.error('Failed to fetch recent emails:', error);
      return [];
    }
  }


  /**
   * Format email for display
   */
  private formatEmailForDisplay(email: any): { subject: string; html: string; receivedDateTime: string, categories?: string[] } {
    const subject = email.subject || 'No Subject';
    const receivedDateTime = email.receivedDateTime;

    if (DEBUG_GRAPH) console.log('=== FORMAT EMAIL FOR DISPLAY ===');
    if (DEBUG_GRAPH) console.log('Email subject:', subject);
    if (DEBUG_GRAPH) console.log('Email categories:', email?.categories);
    if (DEBUG_GRAPH) console.log('Categories type:', typeof email?.categories);
    if (DEBUG_GRAPH) console.log('Categories isArray:', Array.isArray(email?.categories));
    if (DEBUG_GRAPH) console.log('================================');

    // Check if we have body content
    let html = '';
    
    if (email.body && email.body.content) {
      // We have body content! Use it
      const isHtml = (email.body.contentType || '').toLowerCase() === 'html';
      html = isHtml ? email.body.content : email.body.content.replace(/\n/g, '<br/>');
      if (DEBUG_GRAPH) console.log('✅ Email body content available!');
    } else {
      // No body content - show basic info
      html = `<div class="email-preview bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p class="mb-2"><strong>Subject:</strong> ${subject}</p>
        <p class="mb-2"><strong>Date:</strong> ${new Date(receivedDateTime).toLocaleString()}</p>
        <p class="text-sm text-gray-600 mt-3">
          <em>📧 Email body content is not available. Your current Mail.Read permission allows basic email metadata.</em>
        </p>
        <p class="text-xs text-gray-500 mt-2">
          To see full email content, ensure your organization allows Graph API body access.
        </p>
      </div>`;
      if (DEBUG_GRAPH) console.log('ℹ️ Email body not available - showing metadata only');
    }

    const result = { 
      subject, 
      html, 
      receivedDateTime, 
      categories: Array.isArray(email.categories) ? email.categories : undefined 
    };
    if (DEBUG_GRAPH) console.log('Returning from formatEmailForDisplay, categories:', result.categories);
    return result;
  }

  /**
   * Smart contact extraction - get unique contacts from email history efficiently
   * Optimized for large-scale processing with progress tracking
   */
  async getSmartContacts(
    maxEmails: number = 5000,
    onProgress?: (stage: string, processed: number, total: number, message: string) => void
  ): Promise<Array<{ id: string; name: string; email: string; lastContactDate: Date | null }>> {
    try {
      const currentUser = await this.getCurrentUser();
      const userEmail = currentUser.mail;
      
      console.log(`Smart contact extraction - fetching up to ${maxEmails} emails...`);
      
      // Get contacts from multiple time periods to build a comprehensive contact list
      const contactMap = new Map<string, { 
        id: string; 
        name: string; 
        email: string; 
        lastContactDate: Date | null;
        emailCount: number;
      }>();
      
      // Fetch emails from different periods to get diverse contacts
      const periods = [0, 30, 90, 180, 365, 730]; // Last 2 years with sampling
      const totalPeriods = periods.length;
      
      for (let i = 0; i < periods.length; i++) {
        const daysBack = periods[i];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const cutoffDateStr = cutoffDate.toISOString();
        
        console.log(`Fetching emails from ${daysBack} days ago...`);
        onProgress?.('fetching_emails', i, totalPeriods, `Fetching emails from ${daysBack} days ago...`);
        
        // Get sent emails from this period
        const sentResponse = await this.makeGraphApiCall<{ value: EmailMessage[] }>(
          `/me/mailFolders/sentitems/messages?$top=1000&$filter=sentDateTime ge ${cutoffDateStr}&$orderby=sentDateTime desc&$select=id,subject,sentDateTime,receivedDateTime,from,toRecipients`
        );
        
        // Get received emails from this period  
        const receivedResponse = await this.makeGraphApiCall<{ value: EmailMessage[] }>(
          `/me/mailFolders/inbox/messages?$top=1000&$filter=receivedDateTime ge ${cutoffDateStr}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,isRead`
        );
        
        // Process sent emails
        sentResponse.value.forEach(email => {
          email.toRecipients.forEach(recipient => {
            if (recipient.emailAddress.address !== userEmail) {
              const emailAddr = recipient.emailAddress.address;
              const contactDate = new Date(email.sentDateTime || email.receivedDateTime);
              
              if (!contactMap.has(emailAddr) || contactMap.get(emailAddr)!.lastContactDate! < contactDate) {
                contactMap.set(emailAddr, {
                  id: emailAddr,
                  name: recipient.emailAddress.name || emailAddr.split('@')[0],
                  email: emailAddr,
                  lastContactDate: contactDate,
                  emailCount: (contactMap.get(emailAddr)?.emailCount || 0) + 1
                });
              } else {
                // Update email count
                const existing = contactMap.get(emailAddr)!;
                existing.emailCount += 1;
              }
            }
          });
        });
        
        // Process received emails
        receivedResponse.value.forEach(email => {
          const senderEmail = email.from.emailAddress.address;
          if (senderEmail !== userEmail) {
            const contactDate = new Date(email.receivedDateTime);
            
            if (!contactMap.has(senderEmail) || contactMap.get(senderEmail)!.lastContactDate! < contactDate) {
              contactMap.set(senderEmail, {
                id: senderEmail,
                name: email.from.emailAddress.name || senderEmail.split('@')[0],
                email: senderEmail,
                lastContactDate: contactDate,
                emailCount: (contactMap.get(senderEmail)?.emailCount || 0) + 1
              });
            } else {
              // Update email count
              const existing = contactMap.get(senderEmail)!;
              existing.emailCount += 1;
            }
          }
        });
        
        console.log(`Found ${contactMap.size} unique contacts so far...`);
        onProgress?.('processing_contacts', contactMap.size, maxEmails, `Found ${contactMap.size} unique contacts...`);
        
        // Stop if we have enough contacts or reached limit
        if (contactMap.size > maxEmails / 10) { // Rough estimate
          break;
        }
      }
      
      // Convert to array and sort by last contact date (oldest first for prioritization)
      const contacts = Array.from(contactMap.values())
        .sort((a, b) => {
          if (!a.lastContactDate) return 1;
          if (!b.lastContactDate) return -1;
          return a.lastContactDate.getTime() - b.lastContactDate.getTime();
        });
      
      console.log(`Smart extraction complete: ${contacts.length} unique contacts found`);
      return contacts;
    } catch (error) {
      console.error('Smart contact extraction failed:', error);
      throw error;
    }
  }

  /**
   * Get email messages from different time periods for better contact coverage
   */
  async getEmailMessagesFromPeriods(folder: 'inbox' | 'sentitems', periods: number[]): Promise<EmailMessage[]> {
    try {
      const allEmails: EmailMessage[] = [];
      
      for (const daysBack of periods) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysBack);
        const cutoffDateStr = cutoffDate.toISOString();
        
        const response = await this.makeGraphApiCall<{ value: EmailMessage[] }>(
          `/me/mailFolders/${folder}/messages?$top=100&$filter=receivedDateTime ge ${cutoffDateStr}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,isRead`
        );
        
        allEmails.push(...response.value);
      }
      
      // Remove duplicates based on email ID
      const uniqueEmails = allEmails.filter((email, index, self) => 
        index === self.findIndex(e => e.id === email.id)
      );
      
      return uniqueEmails;
    } catch (error) {
      console.error('Failed to get email messages from periods:', error);
      throw error;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = true
  ): Promise<void> {
    try {
      const emailPayload = {
        message: {
          subject,
          body: {
            contentType: isHtml ? 'HTML' : 'Text',
            content: body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
        },
        saveToSentItems: true,
      };

      await this.makeGraphApiCall('/me/sendMail', 'POST', emailPayload);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{ displayName: string; mail: string; id: string }> {
    try {
      return await this.makeGraphApiCall('/me');
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Get contacts formatted for our analysis service
   * This method extracts contacts from email interactions since Outlook contacts folder might be empty
   */
  async getContactsForAnalysis(options: { 
    maxEmails?: number; 
    useAllEmails?: boolean;
    quickMode?: boolean;
  } = {}): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const currentUser = await this.getCurrentUser();
      const userEmail = currentUser.mail;
      const { maxEmails = 10000, useAllEmails = false, quickMode = false } = options;
      
      console.log(`Contact analysis options: maxEmails=${maxEmails}, useAllEmails=${useAllEmails}, quickMode=${quickMode}`);
      
      // Get contacts from Outlook contacts folder first
      let contacts = await this.getContacts();
      const outlookContacts = contacts.map(contact => ({
        id: contact.id,
        name: contact.displayName || 'Unknown',
        email: contact.emailAddresses[0]?.address || ''
      })).filter(contact => contact.email && contact.email !== userEmail);

      let sentEmails: EmailMessage[] = [];
      let receivedEmails: EmailMessage[] = [];
      
      if (useAllEmails) {
        // Use smart contact extraction instead of fetching all emails
        console.log('Using smart contact extraction for comprehensive analysis...');
        const smartContacts = await this.getSmartContacts(maxEmails);
        return smartContacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email
        }));
      } else if (quickMode) {
        // Quick mode: just recent emails
        console.log('Quick mode: fetching recent emails only...');
        sentEmails = await this.getEmailMessages('sentitems', 1000);
        receivedEmails = await this.getEmailMessages('inbox', 1000);
      } else {
        // Balanced mode: sample from different time periods
        console.log('Balanced mode: sampling from different time periods...');
        sentEmails = await this.getEmailMessagesFromPeriods('sentitems', [0, 30, 90, 180, 365]);
        receivedEmails = await this.getEmailMessagesFromPeriods('inbox', [0, 30, 90, 180, 365]);
      }
      
      const emailContacts = new Map<string, { id: string; name: string; email: string }>();
      
      // Process sent emails
      sentEmails.forEach(email => {
        email.toRecipients.forEach(recipient => {
          if (recipient.emailAddress.address !== userEmail) {
            emailContacts.set(recipient.emailAddress.address, {
              id: recipient.emailAddress.address, // Use email as ID
              name: recipient.emailAddress.name || recipient.emailAddress.address.split('@')[0],
              email: recipient.emailAddress.address
            });
          }
        });
      });
      
      // Process received emails
      receivedEmails.forEach(email => {
        const senderEmail = email.from.emailAddress.address;
        if (senderEmail !== userEmail) {
          emailContacts.set(senderEmail, {
            id: senderEmail,
            name: email.from.emailAddress.name || senderEmail.split('@')[0],
            email: senderEmail
          });
        }
      });
      
      // Combine Outlook contacts with email contacts
      const allContacts = [...outlookContacts];
      emailContacts.forEach((contact) => {
        if (!allContacts.find(c => c.email === contact.email)) {
          allContacts.push(contact);
        }
      });

      console.log(`Found ${outlookContacts.length} Outlook contacts and ${emailContacts.size} email contacts (${allContacts.length} total)`);
      console.log(`Email sources: ${sentEmails.length} sent emails, ${receivedEmails.length} received emails`);
      return allContacts;
    } catch (error) {
      console.error('Failed to get contacts for analysis:', error);
      throw error;
    }
  }

  /**
   * Extract thread ID from email subject for better conversation grouping
   */
  private extractThreadId(subject: string): string {
    // Remove common reply prefixes to get base subject
    const baseSubject = subject
      .replace(/^(re:|fwd?:|fw:)\s*/i, '')
      .trim()
      .toLowerCase();
    
    // Create a hash-like thread ID from the base subject
    return baseSubject.replace(/[^a-z0-9]/g, '').substring(0, 20) || 'thread-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get email interactions for contact analysis - optimized for specific contacts
   */
  async getEmailInteractionsForAnalysis(limit: number = 200): Promise<Array<{
    id: string;
    contactId: string;
    subject: string;
    date: Date;
    direction: 'sent' | 'received';
    isRead: boolean;
    isReplied: boolean;
    threadId?: string;
  }>> {
    try {
      const currentUser = await this.getCurrentUser();
      const userEmail = currentUser.mail;
      
      // Get a reasonable sample of recent emails for interaction analysis
      const sentEmails = await this.getEmailMessages('sentitems', Math.min(limit, 1000));
      const receivedEmails = await this.getEmailMessages('inbox', Math.min(limit, 1000));
      
      const interactions: Array<{
        id: string;
        contactId: string;
        subject: string;
        date: Date;
        direction: 'sent' | 'received';
        isRead: boolean;
        isReplied: boolean;
        threadId?: string;
      }> = [];

      // Process sent emails
      sentEmails.forEach(email => {
        email.toRecipients.forEach(recipient => {
          if (recipient.emailAddress.address !== userEmail) {
            interactions.push({
              id: email.id,
              contactId: recipient.emailAddress.address,
              subject: email.subject || 'No Subject',
              date: new Date(email.sentDateTime || email.receivedDateTime),
              direction: 'sent',
              isRead: true,
              isReplied: false,
              threadId: this.extractThreadId(email.subject || '')
            });
          }
        });
      });

      // Process received emails
      receivedEmails.forEach(email => {
        const senderEmail = email.from.emailAddress.address;
        if (senderEmail !== userEmail) {
          interactions.push({
            id: email.id,
            contactId: senderEmail,
            subject: email.subject || 'No Subject',
            date: new Date(email.receivedDateTime),
            direction: 'received',
            isRead: email.isRead,
            isReplied: false,
            threadId: this.extractThreadId(email.subject || '')
          });
        }
      });

      console.log(`Found ${interactions.length} email interactions for analysis`);
      return interactions;
    } catch (error) {
      console.error('Failed to get email interactions for analysis:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const graphService = new MicrosoftGraphService();
