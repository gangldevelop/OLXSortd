import { GraphClient } from './graphClient';
import type { EmailMessage } from './mailService';

interface EmailContactRaw {
  id: string;
  displayName: string;
  emailAddresses: Array<{ address: string; name?: string }>;
}

export class ContactsService {
  private readonly graph: GraphClient;
  constructor(graph: GraphClient) {
    this.graph = graph;
  }

  async getContacts(): Promise<EmailContactRaw[]> {
    const response = await this.graph.request<{ value: EmailContactRaw[] }>(
      '/me/contacts?$select=id,displayName,emailAddresses'
    );
    return response.value;
  }

  async getEmailMessagesFromPeriods(folder: 'inbox' | 'sentitems', periods: number[]): Promise<EmailMessage[]> {
    const timeField = folder === 'sentitems' ? 'sentDateTime' : 'receivedDateTime';
    const allEmails: EmailMessage[] = [];
    
    for (const daysBack of periods) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateStr = cutoffDate.toISOString();
      const response = await this.graph.request<{ value: EmailMessage[] }>(
        `/me/mailFolders/${folder}/messages?$top=100&$filter=${timeField} ge ${cutoffDateStr}&$orderby=${timeField} desc&$select=id,subject,receivedDateTime,sentDateTime,from,toRecipients,isRead`
      );
      allEmails.push(...response.value);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const uniqueEmails = allEmails.filter((email, index, self) => index === self.findIndex(e => e.id === email.id));
    return uniqueEmails;
  }

  async getEmailMessagesSince(
    folder: 'inbox' | 'sentitems',
    sinceIso: string,
    maxPages: number = 5,
    pageSize: number = 1000 // Optimized: 1000 per page = massive reduction in round trips
  ): Promise<EmailMessage[]> {
    const startTime = performance.now();
    const emails: EmailMessage[] = [];
    const timeField = folder === 'sentitems' ? 'sentDateTime' : 'receivedDateTime';
    const baseUrl = `/me/mailFolders/${folder}/messages?$top=${pageSize}&$filter=${timeField} ge ${sinceIso}&$orderby=${timeField} desc&$select=id,subject,receivedDateTime,sentDateTime,from,toRecipients,isRead`;
    
    // Fetch first page to get @odata.nextLink
    const firstResp = await this.graph.request<any>(baseUrl);
    const firstPageEmails: EmailMessage[] = firstResp.value || [];
    emails.push(...firstPageEmails);

    // If no next link or we've hit max pages, return
    let nextLink = firstResp['@odata.nextLink'] as string | undefined;
    if (!nextLink || maxPages <= 1) {
      console.log(`[${folder}] Fetched 1 page (${emails.length} emails) in ${(performance.now() - startTime).toFixed(0)}ms`);
      return emails;
    }

    // Fetch remaining pages sequentially with minimal throttling
    // With 1000/page we need far fewer requests, so minimal delay is safe
    let page = 1;

    while (nextLink && page < maxPages) {
      await new Promise(resolve => setTimeout(resolve, 5)); // Minimal delay for rate limiting
      
      const resp: any = await this.graph.request<any>(nextLink);
      const pageEmails: EmailMessage[] = resp.value || [];
      emails.push(...pageEmails);
      nextLink = (resp['@odata.nextLink'] as string | undefined) || undefined;
      page++;
    }

    console.log(`[${folder}] Fetched ${page} pages (${emails.length} emails) in ${(performance.now() - startTime).toFixed(0)}ms`);
    return emails;
  }
}


