import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthenticationResult, AccountInfo } from '@azure/msal-browser';

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
  body: {
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

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
      authority: 'https://login.microsoftonline.com/common',
      redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
      scopes: (import.meta.env.VITE_GRAPH_SCOPES || '').split(',')
    };

    // Debug logging
    console.log('MSAL Configuration:', {
      clientId: this.config.clientId,
      authority: this.config.authority,
      redirectUri: this.config.redirectUri,
      scopes: this.config.scopes
    });

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
  }

  /**
   * Initialize MSAL and check for existing accounts
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      console.log('MSAL initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      throw error;
    }
  }

  /**
   * Sign in user and get access token
   */
  async signIn(): Promise<AuthenticationResult | null> {
    try {
      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account' as const,
      };

      const response = await this.msalInstance.loginPopup(loginRequest);
      console.log('User signed in successfully');
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
        console.log('User signed out successfully');
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
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      console.log(`Found ${accounts.length} accounts`);
      
      if (accounts.length === 0) {
        console.log('No accounts found, user needs to sign in');
        return null;
      }

      const silentRequest = {
        scopes: this.config.scopes,
        account: accounts[0],
      };

      console.log('Attempting to acquire token silently...');
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      console.log('Token acquired successfully');
      return response.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      // Try interactive login if silent fails
      try {
        console.log('Attempting interactive login...');
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

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Graph API call failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Graph API call failed:', error);
      throw error;
    }
  }

  /**
   * Get user's contacts
   */
  async getContacts(): Promise<EmailContact[]> {
    try {
      const response = await this.makeGraphApiCall<{ value: EmailContact[] }>('/me/contacts');
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
        `/me/mailFolders/${folder}/messages?$top=${limit}&$orderby=receivedDateTime desc`
      );
      return response.value;
    } catch (error) {
      console.error('Failed to get email messages:', error);
      throw error;
    }
  }

  /**
   * Get the most recent email (subject + HTML body) exchanged with a contact
   */
  async getLastEmailWithContact(contactEmail: string): Promise<{ subject: string; html: string; receivedDateTime: string } | null> {
    try {
      const encoded = encodeURIComponent(contactEmail);
      const endpoint = `/me/messages?$search=%22${encoded}%22&$orderby=receivedDateTime desc&$top=1&$select=subject,body,receivedDateTime,from,toRecipients`;
      const response = await this.makeGraphApiCall<{ value: Array<{ subject: string; body: { contentType: string; content: string }; receivedDateTime: string; from: any; toRecipients: any[] }> }>(
        endpoint,
        'GET',
        undefined,
        { 'ConsistencyLevel': 'eventual' }
      );
      const msg = response.value?.[0];
      if (!msg) return null;
      const isHtml = (msg.body?.contentType || '').toLowerCase() === 'html';
      const html = isHtml ? (msg.body?.content || '') : (msg.body?.content || '').replace(/\n/g, '<br/>');
      return { subject: msg.subject || 'No Subject', html, receivedDateTime: msg.receivedDateTime };
    } catch (error) {
      console.error('Failed to get last email for contact:', error);
      return null;
    }
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
          `/me/mailFolders/sentitems/messages?$top=1000&$filter=sentDateTime ge ${cutoffDateStr}&$orderby=sentDateTime desc`
        );
        
        // Get received emails from this period  
        const receivedResponse = await this.makeGraphApiCall<{ value: EmailMessage[] }>(
          `/me/mailFolders/inbox/messages?$top=1000&$filter=receivedDateTime ge ${cutoffDateStr}&$orderby=receivedDateTime desc`
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
          `/me/mailFolders/${folder}/messages?$top=100&$filter=receivedDateTime ge ${cutoffDateStr}&$orderby=receivedDateTime desc`
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
