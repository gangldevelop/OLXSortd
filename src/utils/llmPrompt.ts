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
    
    // Remove style, script, and head tags (they're just noise)
    doc.querySelectorAll('style, script, head').forEach(el => el.remove());
    
    // Remove Teams meeting boilerplate
    doc.querySelectorAll('.me-email-text, .me-email-text-secondary, [href*="teams.microsoft.com"]').forEach(el => {
      const parent = el.parentElement;
      if (parent && (el.textContent?.includes('Meeting ID') || el.textContent?.includes('Passcode') || el.textContent?.includes('Join the meeting'))) {
        parent.remove();
      }
    });
    
    // Get text content and clean up excessive whitespace
    let text = doc.body.textContent || '';
    text = text.replace(/\r\n/g, '\n')              // normalize line breaks
               .replace(/\n{3,}/g, '\n\n')          // max 2 consecutive newlines
               .replace(/[ \t]+/g, ' ')             // collapse spaces
               .replace(/\n /g, '\n')               // remove leading spaces on lines
               .replace(/_+/g, '')                  // remove underscores (often used as separators)
               .trim();
    
    return text;
  }

  // Fallback: strip tags and clean whitespace
  return html.replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .replace(/_+/g, '')
             .trim();
}

function truncateText(text: string, maxChars: number = 4000): string {
  if (text.length <= maxChars) {
    return text;
  }
  
  // Take the last maxChars (most recent content is usually at the end)
  const truncated = text.slice(-maxChars);
  return `[...email truncated to last ${maxChars} characters...]\n\n${truncated}`;
}

export function buildDraftPrompt(params: BuildDraftPromptParams): DraftPromptMessages {
  const language = params.language || 'de';
  const lastEmailText = truncateText(htmlToPlainText(params.lastEmailHtml), 4000);

  const system =
    language === 'de'
      ? 'Du bist ein professioneller E-Mail-Assistent für ein B2B-Software-Unternehmen. ' +
        'Deine Aufgabe ist es, natürliche, kontextbezogene Antworten auf geschäftliche E-Mails zu verfassen. ' +
        'Analysiere die letzte E-Mail sorgfältig und verstehe den Kontext, bevor du antwortest. ' +
        'Schreibe kurz, präzise und professionell. Vermeide generische Standardantworten oder Verkaufsfloskeln, ' +
        'es sei denn, die E-Mail ist eindeutig eine Verkaufsanfrage. ' +
        'Antworte immer direkt auf den Inhalt der letzten E-Mail. ' +
        'WICHTIG: Antworte NUR mit reinem JSON. Keine Markdown-Formatierung, keine Code-Blöcke, keine Erklärungen. Nur das JSON-Objekt.'
      : 'You are a professional email assistant for a B2B software company. ' +
        'Your task is to write natural, context-aware responses to business emails. ' +
        'Carefully analyze the last email and understand the context before responding. ' +
        'Write concisely, precisely, and professionally. Avoid generic templates or sales pitches ' +
        'unless the email is clearly a sales inquiry. ' +
        'Always respond directly to the content of the last email. ' +
        'IMPORTANT: Reply with raw JSON only. No markdown formatting, no code blocks, no explanations. Just the JSON object.';

  const user =
    language === 'de'
      ? [
          `Du bist "${params.senderName}" und schreibst an "${params.contactName}".`,
          '',
          'KONTEXT: Dies ist die letzte E-Mail in einer Konversation. Sie kann von mir stammen (ausgehend) oder vom Kontakt (eingehend).',
          '',
          'AUFGABE:',
          '1. Lies die E-Mail unten sorgfältig',
          '2. Verstehe den Kontext und das Thema',
          '3. Wenn die E-Mail VON MIR stammt (ich habe dem Kontakt etwas erklärt/angeboten):',
          '   - Schreibe eine kurze Nachverfolgung oder Frage nach Feedback',
          '   - Beispiel: "Haben Sie noch Fragen dazu?" oder "Brauchen Sie weitere Informationen?"',
          '4. Wenn die E-Mail VOM KONTAKT stammt (eine Frage/Anfrage/Kommentar an mich):',
          '   - Beantworte die Frage oder gehe auf den Kommentar ein',
          '   - Sei spezifisch und relevant',
          '5. Betreffzeile sollte das Thema widerspiegeln (ohne "Re:" oder "AW:")',
          '6. Halte die Antwort kurz und geschäftsmäßig (2-4 Absätze maximal)',
          '',
          'AUSGABEFORMAT - Antworte NUR mit diesem JSON (keine Markdown-Blöcke, keine Erklärungen):',
          '{"subject":"Betreffzeile","bodyHtml":"<p>Antwort</p>","bodyText":"Antwort"}',
          '',
          'BEISPIEL für korrekte Antwort:',
          '{"subject":"Lizenzanfrage OLXDisclaimer","bodyHtml":"<p>Hallo,</p><p>Inhalt hier</p><p>Grüße</p>","bodyText":"Hallo, Inhalt hier Grüße"}',
          '',
          '=== LETZTE E-MAIL ===',
          lastEmailText || '(kein Inhalt verfügbar)',
        ].join('\n')
      : [
          `You are "${params.senderName}" writing to "${params.contactName}".`,
          '',
          'CONTEXT: This is the last email in a conversation. It could be from me (outbound) or from the contact (inbound).',
          '',
          'TASK:',
          '1. Read the email below carefully',
          '2. Understand the context and topic',
          '3. If the email is FROM ME (I explained/offered something to the contact):',
          '   - Write a brief follow-up or ask for feedback',
          '   - Example: "Do you have any questions?" or "Do you need more information?"',
          '4. If the email is FROM THE CONTACT (a question/request/comment to me):',
          '   - Answer the question or address the comment',
          '   - Be specific and relevant',
          '5. Subject line should reflect the topic (without "Re:" prefix)',
          '6. Keep the response short and business-like (2-4 paragraphs max)',
          '',
          'OUTPUT FORMAT - Reply with ONLY this JSON (no markdown blocks, no explanations):',
          '{"subject":"Subject line","bodyHtml":"<p>Response</p>","bodyText":"Response"}',
          '',
          'EXAMPLE of correct response:',
          '{"subject":"License inquiry","bodyHtml":"<p>Hello,</p><p>Content here</p><p>Regards</p>","bodyText":"Hello, Content here Regards"}',
          '',
          '=== LAST EMAIL ===',
          lastEmailText || '(no content available)',
        ].join('\n');

  return { system, user, lastEmailText };
}

