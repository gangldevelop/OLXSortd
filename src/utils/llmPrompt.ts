export interface BuildDraftPromptParams {
  lastEmailHtml: string;
  contactName: string;
  senderName: string;
  language?: string;
}

export interface DraftPromptMessages {
  system: string;
  user: string;
  lastEmailText: string;
}

function htmlToPlainText(html: string): string {
  if (!html) return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
  }

  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) {
    return text;
  }
  
  // Take the last maxChars (most recent content is usually at the end)
  const truncated = text.slice(-maxChars);
  return `[...email truncated to last ${maxChars} characters...]\n\n${truncated}`;
}

export function buildDraftPrompt(params: BuildDraftPromptParams): DraftPromptMessages {
  const language = params.language || 'de';
  const lastEmailText = truncateText(htmlToPlainText(params.lastEmailHtml), 8000);

  const system =
    language === 'de'
      ? 'Du bist ein Assistent, der professionelle geschäftliche E‑Mails auf Deutsch formuliert. ' +
        'Halte den Ton höflich, klar und knapp. Antworte immer in HTML (kein Markdown).'
      : 'You are an assistant that writes professional business emails. ' +
        'Keep the tone polite, clear and concise. Always answer in HTML (no Markdown).';

  const user =
    language === 'de'
      ? [
          `Erstelle einen Antwortentwurf auf die folgende letzte E‑Mail-Konversation.`,
          `Du schreibst als "${params.senderName}" an "${params.contactName}".`,
          'Gib bitte folgendes JSON zurück:',
          '{',
          '  "subject": "Betreffzeile ohne Präfix wie Re:",',
          '  "bodyHtml": "<p>HTML‑Inhalt der Antwort…</p>",',
          '  "bodyText": "Nur-Text-Version der Antwort ohne HTML-Tags"',
          '}',
          '',
          'Letzte E‑Mail als Text:',
          lastEmailText || '(kein Inhalt verfügbar)',
        ].join('\n')
      : [
          `Draft a reply to the following last email conversation.`,
          `You are "${params.senderName}" writing to "${params.contactName}".`,
          'Return the following JSON:',
          '{',
          '  "subject": "Subject line without prefixes like Re:",',
          '  "bodyHtml": "<p>HTML content of the reply…</p>",',
          '  "bodyText": "Plain text version of the reply without HTML tags"',
          '}',
          '',
          'Last email as text:',
          lastEmailText || '(no content available)',
        ].join('\n');

  return { system, user, lastEmailText };
}

