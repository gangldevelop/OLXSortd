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
      const response = await this.graph.request<{ value: EmailMessage[] }>(
        `/me/mailFolders/${folder}/messages?$top=100&$filter=receivedDateTime ge ${cutoffDateStr}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,isRead`
      );
      allEmails.push(...response.value);
    }
    const uniqueEmails = allEmails.filter((email, index, self) => index === self.findIndex(e => e.id === email.id));
    return uniqueEmails;
  }
}


