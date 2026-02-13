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

  const subjectMatch = cleaned.match(/BETREFF:\s*(.+?)(?:\s*---|\n)/);

  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    const dashIndex = cleaned.indexOf('---', cleaned.indexOf('BETREFF:'));
    if (dashIndex !== -1) {
      bodyText = cleaned.substring(dashIndex).replace(/^-+\s*/, '').trim();
    } else {
      bodyText = cleaned.substring(cleaned.indexOf('\n') + 1).trim();
    }
  } else {
    subject = fallbackSubject || '';
  }

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
 * Determines if this is an outreach scenario based on time since last contact.
 */
function determineEmailContext(params: BuildDraftPromptParams): {
  isOutreach: boolean;
  contextNote: string;
} {
  const days = params.daysSinceLastContact ?? 0;
  const category = params.contactCategory;

  // Outreach scenarios: inactive category OR long time since contact
  if (category === 'inactive' || days >= 180) {
    return {
      isOutreach: true,
      contextNote: days >= 365
        ? `ueber ein Jahr (${Math.floor(days / 30)} Monate)`
        : days >= 180
        ? `mehrere Monate (${Math.floor(days / 30)} Monate)`
        : 'laengerer Zeit',
    };
  }

  // Moderate gap: acknowledge but less formal
  if (days >= 90 && days < 180) {
    return {
      isOutreach: true,
      contextNote: 'einiger Zeit',
    };
  }

  // Recent contact: normal reply tone
  return {
    isOutreach: false,
    contextNote: '',
  };
}

/**
 * Single-pass draft prompt. Parse output with parseDraftResponse().
 *
 * Usage:
 *   const prompt = buildDraftPrompt(params);
 *   const raw = await callLLM(prompt.system, prompt.user);
 *   const result = parseDraftResponse(raw);
 *   // result = { subject, bodyText, bodyHtml }
 */
export function buildDraftPrompt(params: BuildDraftPromptParams): DraftPromptMessages {
  const { isOutreach, contextNote } = determineEmailContext(params);
  const maxEmailChars = isOutreach ? 1500 : 2000;
  const lastEmailText = truncateText(htmlToPlainText(params.lastEmailHtml), maxEmailChars);

  // Base system prompt
  let system =
    'Du bist ein E-Mail-Assistent eines B2B-Software-Unternehmens. ' +
    'Schreibe an langjaehrige Bestandskunden. Tonfall: formell aber warmherzig. ' +
    'Sie-Anrede. NUR Deutsch. Kein HTML, kein JSON, keine Sonderzeichen. ' +
    'Regeln: ' +
    '1. Anrede NUR mit Nachname: "Sehr geehrter Herr Mueller" oder "Sehr geehrte Frau Schmidt". Niemals Vorname verwenden. ' +
    '2. Anrede geschlechtergerecht: "Sehr geehrter Herr" fuer Maenner, "Sehr geehrte Frau" fuer Frauen. Bei unbekanntem Geschlecht: "Guten Tag" mit Nachname. ' +
    '3. Statt "Vielen Dank fuer Ihre Nachricht" immer "Vielen Dank fuer Ihre Anfrage" verwenden. ' +
    '4. Niemals entschuldigen oder bedauern. Kein "Wir bedauern", kein "Es tut uns leid", kein "Entschuldigung". ' +
    'Stattdessen positiv formulieren: "Gerne helfen wir Ihnen", "Wir kuemmern uns darum", "Wir unterstuetzen Sie gerne".';

  // Add outreach-specific guidance
  if (isOutreach) {
    system +=
      ' ' +
      'OUTREACH-KONTEXT: ' +
      `Letzter Kontakt vor ${contextNote}. Dies ist eine Wiederaufnahme-E-Mail. ` +
      'Outreach-Regeln: ' +
      '5. Beginne mit freundlicher Anerkennung der vergangenen Zeit. ' +
      'Z.B.: "es ist eine Weile her seit unserem letzten Austausch" oder "ich melde mich wieder bei Ihnen". ' +
      '6. Zeige Interesse an der aktuellen Situation des Kunden. Frage nach aktuellen Projekten oder Herausforderungen. ' +
      '7. Falls die letzte E-Mail Themen enthielt, beziehe dich kurz darauf aber erkenne an dass sich die Situation geaendert haben koennte. ' +
      '8. Biete proaktiv Unterstuetzung oder Updates zu relevanten Produkten an. ' +
      '9. Tonfall: freundlich, respektvoll, nicht aufdringlich. Kein "Wir vermissen Sie" oder uebertrieben emotionale Formulierungen.';
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
  } else {
    userPromptParts.push(
      'Beantworte die E-Mail unten. Identifiziere jede Frage und beantworte sie konkret.',
      'Wenn du die Antwort nicht kennst, bestaetige die Frage und sage zu dich darum zu kuemmern.',
      '',
    );
  }

  userPromptParts.push(
    'Format:',
    'BETREFF: (Betreffzeile)',
    '---',
    '(E-Mail mit Absaetzen)',
    '',
    `Grussformel: "Mit freundlichen Gruessen" dann "${params.senderName}"`,
    '',
    '--- E-MAIL ---',
    lastEmailText || '(kein Inhalt)',
    '--- ENDE ---',
  );

  const user = userPromptParts.join('\n');

  return { system, user, lastEmailText };
}