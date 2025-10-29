import { GraphClient } from './graphClient';

export interface EmailMessage {
  id: string;
  subject: string;
  body?: { content: string; contentType: 'text' | 'html' };
  from: { emailAddress: { address: string; name?: string } };
  toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  categories?: string[];
}

export class MailService {
  private readonly graph: GraphClient;
  constructor(graph: GraphClient) {
    this.graph = graph;
  }

  async getEmailMessages(folder: 'inbox' | 'sentitems' = 'inbox', limit: number = 50): Promise<EmailMessage[]> {
    const resp = await this.graph.request<{ value: EmailMessage[] }>(
      `/me/mailFolders/${folder}/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,receivedDateTime,from,toRecipients,isRead`
    );
    return resp.value;
  }

  async getMessageBodyQuick(messageId: string): Promise<{ id: string; subject?: string; receivedDateTime?: string; body?: { content: string; contentType: 'text' | 'html' } } | null> {
    try {
      const safeId = encodeURIComponent(messageId);
      const endpoint = `/me/messages/${safeId}?$select=id,subject,receivedDateTime,body`;
      const msg = await this.graph.request<any>(endpoint, 'GET', undefined, {
        Prefer: 'outlook.body-content-type="html"'
      });
      return msg || null;
    } catch {
      return null;
    }
  }

  async sendEmail(to: string, subject: string, body: string, isHtml: boolean = true): Promise<void> {
    const emailPayload = {
      message: {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body,
        },
        toRecipients: [
          { emailAddress: { address: to } },
        ],
      },
      saveToSentItems: true,
    };
    await this.graph.request('/me/sendMail', 'POST', emailPayload);
  }
}


