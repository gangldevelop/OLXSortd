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
    const allEmails: EmailMessage[] = [];
    for (const daysBack of periods) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateStr = cutoffDate.toISOString();
      const timeField = folder === 'sentitems' ? 'sentDateTime' : 'receivedDateTime';
      const response = await this.graph.request<{ value: EmailMessage[] }>(
        `/me/mailFolders/${folder}/messages?$top=100&$filter=${timeField} ge ${cutoffDateStr}&$orderby=${timeField} desc&$select=id,subject,receivedDateTime,sentDateTime,from,toRecipients,isRead`
      );
      allEmails.push(...response.value);
    }
    const uniqueEmails = allEmails.filter((email, index, self) => index === self.findIndex(e => e.id === email.id));
    return uniqueEmails;
  }

  async getEmailMessagesSince(
    folder: 'inbox' | 'sentitems',
    sinceIso: string,
    maxPages: number = 20,
    pageSize: number = 100
  ): Promise<EmailMessage[]> {
    const emails: EmailMessage[] = [];
    const timeField = folder === 'sentitems' ? 'sentDateTime' : 'receivedDateTime';
    let next: string | null = `/me/mailFolders/${folder}/messages?$top=${pageSize}&$filter=${timeField} ge ${sinceIso}&$orderby=${timeField} desc&$select=id,subject,receivedDateTime,sentDateTime,from,toRecipients,isRead`;
    let pages = 0;
    while (next && pages < maxPages) {
      const resp = await this.graph.request<any>(next);
      const value: EmailMessage[] = resp.value || [];
      emails.push(...value);
      const nextLink = resp['@odata.nextLink'] as string | undefined;
      next = nextLink || null;
      pages++;
    }
    return emails;
  }
}


