export interface BuildDraftPromptParams {
  lastEmailHtml: string;
  contactName: string;
  senderName: string;
  daysSinceLastContact?: number;
  contactCategory?: 'recent' | 'in_touch' | 'inactive';
  totalEmailCount?: number;
}

export interface DraftPromptMessages {
  system: string;
  user: string;
  lastEmailText: string;
}

export interface ParsedDraft {
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

function htmlToPlainText(html: string): string {
  if (!html) return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('style, script, head').forEach(el => el.remove());

    doc.querySelectorAll('.me-email-text, .me-email-text-secondary, [href*="teams.microsoft.com"]').forEach(el => {
      const parent = el.parentElement;
      if (parent && (el.textContent?.includes('Meeting ID') || el.textContent?.includes('Passcode') || el.textContent?.includes('Join the meeting'))) {
        parent.remove();
      }
    });

    let text = doc.body.textContent || '';
    text = text.replace(/\r\n/g, '\n')
               .replace(/\n{3,}/g, '\n\n')
               .replace(/[ \t]+/g, ' ')
               .replace(/\n /g, '\n')
               .replace(/_+/g, '')
               .trim();

    return text;
  }

  return html.replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ')
             .replace(/_+/g, '')
             .trim();
}

function truncateText(text: string, maxChars: number = 2000): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(-maxChars);
}

export function textToHtml(text: string): string {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Parses raw LLM output into structured fields.
 */
export function parseDraftResponse(raw: string, fallbackSubject?: string): ParsedDraft {
  let cleaned = raw
    .replace(/[{}[\]\\]/g, '')
    .replace(/"/g, '')
    .trim();

  let subject = '';
  let bodyText = cleaned;

  // Case-insensitive match for BETREFF: or Betreff:
  const subjectMatch = cleaned.match(/betreff:\s*(.+?)(?:\s*---|\n)/i);

  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    // Find the position after the subject line
    const subjectLineEnd = subjectMatch.index! + subjectMatch[0].length;
    
    // Look for separator (---) after subject
    const remainingText = cleaned.substring(subjectLineEnd);
    const dashIndex = remainingText.indexOf('---');
    
    if (dashIndex !== -1) {
      bodyText = remainingText.substring(dashIndex).replace(/^-+\s*/, '').trim();
    } else {
      // No separator, take everything after the subject line
      bodyText = remainingText.trim();
    }
  } else {
    subject = fallbackSubject || '';
  }

  // Remove any remaining "Betreff:" lines from body (case-insensitive)
  bodyText = bodyText
    .replace(/^betreff:\s*.+$/gmi, '')
    .replace(/betreff:\s*.+$/gmi, '')
    .trim();

  // Remove subject if it appears at the start of body
  if (subject && bodyText.startsWith(subject)) {
    bodyText = bodyText.substring(subject.length).trim();
  }

  bodyText = bodyText
    .replace(/^---+\s*/gm, '')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  bodyText = structureBody(bodyText);

  return {
    subject,
    bodyText,
    bodyHtml: textToHtml(bodyText),
  };
}

function structureBody(text: string): string {
  if (text.includes('\n\n')) return text;

  let s = text;

  s = s.replace(
    /((?:Sehr geehrte[r]?|Guten Tag)\s+(?:Herr|Frau)\s+[^,]+,)\s*/,
    '$1\n\n'
  );

  s = s.replace(/\s*(Mit freundlichen Grüßen)/, '\n\n$1');
  s = s.replace(/(Mit freundlichen Grüßen)\s+/, '$1\n');

  s = s.replace(
    /\.\s+(Zu den|Wir werden|Zur |Um |Bitte |Gerne |Zusätzlich |Darüber hinaus |Des Weiteren |Bezüglich |Zuerst |Abschluss )/g,
    '.\n\n$1'
  );

  return s;
}

/**
 * Determines email mode based on time since last contact AND email content.
 *
 * Three modes:
 * - Reply: recent contact, respond to email content
 * - Hybrid: old contact but has email content, reply + acknowledge time gap
 * - Outreach: old contact, no/minimal email, proactive reconnection
 */
function determineEmailContext(params: BuildDraftPromptParams, emailText: string): {
  isOutreach: boolean;
  isHybrid: boolean;
  contextNote: string;
} {
  const days = params.daysSinceLastContact ?? 0;
  const category = params.contactCategory;
  const hasSubstantialEmail = emailText.length > 100;

  // Long gap but substantial email content = hybrid mode
  if (hasSubstantialEmail && (category === 'inactive' || days >= 180)) {
    return {
      isOutreach: false,
      isHybrid: true,
      contextNote: days >= 365
        ? `ueber ein Jahr (${Math.floor(days / 30)} Monate)`
        : days >= 180
        ? `mehrere Monate (${Math.floor(days / 30)} Monate)`
        : 'laengerer Zeit',
    };
  }

  // No/minimal email content + long gap = pure outreach
  if (!hasSubstantialEmail && (category === 'inactive' || days >= 180)) {
    return {
      isOutreach: true,
      isHybrid: false,
      contextNote: days >= 365
        ? `ueber ein Jahr (${Math.floor(days / 30)} Monate)`
        : days >= 180
        ? `mehrere Monate (${Math.floor(days / 30)} Monate)`
        : 'laengerer Zeit',
    };
  }

  // Moderate gap
  if (days >= 90 && days < 180) {
    return {
      isOutreach: !hasSubstantialEmail,
      isHybrid: hasSubstantialEmail,
      contextNote: 'einiger Zeit',
    };
  }

  // Recent contact: normal reply
  return {
    isOutreach: false,
    isHybrid: false,
    contextNote: '',
  };
}

//  Single-pass draft prompt. Parse output with parseDraftResponse().

//  Usage:   const prompt = buildDraftPrompt(params);
//    const raw = await callLLM(prompt.system, prompt.user);
//    const result = parseDraftResponse(raw);
   // result = { subject, bodyText, bodyHtml }
 
export function buildDraftPrompt(params: BuildDraftPromptParams): DraftPromptMessages {
  const rawEmailText = htmlToPlainText(params.lastEmailHtml);
  const { isOutreach, isHybrid, contextNote } = determineEmailContext(params, rawEmailText);
  const maxEmailChars = isOutreach ? 1500 : 2000;
  const lastEmailText = truncateText(rawEmailText, maxEmailChars);

  // Base system prompt
  let system =
    'Du bist ein E-Mail-Assistent eines B2B-Software-Unternehmens. ' +
    'Schreibe an langjaehrige Bestandskunden. Tonfall: formell aber warmherzig. ' +
    'Sie-Anrede. NUR Deutsch. Kein HTML, kein JSON, keine Sonderzeichen. ' +
    'Regeln: ' +
    '1. Anrede NUR mit Nachname: "Sehr geehrter Herr Mueller" oder "Sehr geehrte Frau Schmidt". Niemals Vorname verwenden. ' +
    '2. Anrede geschlechtergerecht: "Sehr geehrter Herr" fuer Maenner, "Sehr geehrte Frau" fuer Frauen. Bei unbekanntem Geschlecht: "Guten Tag" mit Nachname. ' +
    '3. Statt "Vielen Dank fuer Ihre Nachricht" immer "Vielen Dank fuer Ihre Anfrage" verwenden. ' +
    '4. VERBOTEN: "bedauern", "entschuldigen", "Entschuldigung", "es tut uns leid", "leider". Diese Woerter niemals verwenden. ' +
    'Stattdessen positiv formulieren: "Gerne helfen wir Ihnen", "Wir kuemmern uns darum", "Wir unterstuetzen Sie gerne". ' +
    '5. Erfinde keine Fakten, Termine, Preise oder Zusagen die nicht in der E-Mail stehen. Wenn du etwas nicht weisst, sage zu dich zu erkundigen.';

  // Hybrid mode: reply to email but acknowledge time gap
  if (isHybrid) {
    system +=
      ' ' +
      'ZEITLICHER KONTEXT: ' +
      `Letzter Kontakt vor ${contextNote}. ` +
      'Beantworte die E-Mail inhaltlich aber erwaehne kurz dass es eine Weile her ist. ' +
      'Fokus liegt auf der Beantwortung der E-Mail, nicht auf der Wiederaufnahme. ' +
      'Ein kurzer Satz wie "es freut uns wieder von Ihnen zu hoeren" genuegt.';
  }

  // Pure outreach mode: no substantial email to reply to
  if (isOutreach) {
    system +=
      ' ' +
      'OUTREACH-KONTEXT: ' +
      `Letzter Kontakt vor ${contextNote}. Dies ist eine Wiederaufnahme-E-Mail. ` +
      'Outreach-Regeln: ' +
      '6. Beginne mit freundlicher Anerkennung der vergangenen Zeit. ' +
      'Z.B.: "es ist eine Weile her seit unserem letzten Austausch" oder "ich melde mich wieder bei Ihnen". ' +
      '7. Zeige Interesse an der aktuellen Situation des Kunden. Frage nach aktuellen Projekten oder Herausforderungen. ' +
      '8. Falls die letzte E-Mail Themen enthielt, beziehe dich kurz darauf aber erkenne an dass sich die Situation geaendert haben koennte. ' +
      '9. Biete proaktiv Unterstuetzung oder Updates zu relevanten Produkten an. ' +
      '10. Tonfall: freundlich, respektvoll, nicht aufdringlich. Kein "Wir vermissen Sie" oder uebertrieben emotionale Formulierungen.';
  }

  // Build user prompt
  const userPromptParts = [
    `Von: "${params.senderName}" An: "${params.contactName}"`,
    '',
  ];

  if (isOutreach) {
    userPromptParts.push(
      `KONTEXT: Letzter Kontakt vor ${contextNote}. Dies ist eine OUTREACH-E-Mail.`,
      'Schreibe eine proaktive Wiederaufnahme-E-Mail die:',
      '- Die Zeitspanne seit dem letzten Kontakt anerkennt',
      '- Bezug auf die letzte E-Mail nimmt falls relevant',
      '- Interesse an der aktuellen Situation des Kunden zeigt',
      '- Wert und Unterstuetzung anbietet',
      '',
    );
  } else if (isHybrid) {
    userPromptParts.push(
      `KONTEXT: Letzter Kontakt vor ${contextNote}. Beantworte die E-Mail und erwaehne kurz die vergangene Zeit.`,
      '',
    );
  } else {
    userPromptParts.push(
      'Beantworte die E-Mail unten. Identifiziere jede Frage und beantworte sie konkret.',
      'Wenn du die Antwort nicht kennst, bestaetige die Frage und sage zu dich darum zu kuemmern.',
      '',
    );
  }

  userPromptParts.push(
    'WICHTIG - Format genau einhalten:',
    'BETREFF: (NUR die Betreffzeile, keine weiteren Worte)',
    '---',
    '(E-Mail-Text mit Absaetzen, OHNE "BETREFF:" nochmal zu erwaehnen)',
    '',
    `Grussformel: "Mit freundlichen Gruessen" dann "${params.senderName}"`,
    '',
    'Die Betreffzeile steht NUR in der ersten Zeile nach "BETREFF:". Sie darf NICHT im E-Mail-Text wiederholt werden.',
    '',
    '--- E-MAIL ---',
    lastEmailText || '(kein Inhalt)',
    '--- ENDE ---',
  );

  const user = userPromptParts.join('\n');

  return { system, user, lastEmailText };
}