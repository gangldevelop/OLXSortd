import { buildDraftPrompt, parseDraftResponse } from '../utils/llmPrompt';

export interface GenerateDraftParams {
  lastEmailHtml: string;
  contactName: string;
  senderName: string;
  language?: string;
  daysSinceLastContact?: number;
  contactCategory?: 'recent' | 'in_touch' | 'inactive';
  totalEmailCount?: number;
}

export interface GeneratedDraft {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface LlmClient {
  generateDraft(params: GenerateDraftParams): Promise<GeneratedDraft>;
}

const PROVIDER = import.meta.env.VITE_LLM_PROVIDER ?? 'openai-compatible';
const BASE_URL = import.meta.env.VITE_LLM_BASE_URL ?? '';
const MODEL = import.meta.env.VITE_LLM_MODEL ?? 'phi-3.5-mini-instruct-q4.gguf';
const API_KEY = import.meta.env.VITE_LLM_API_KEY ?? '';

async function callOpenAiCompatible(
  payload: unknown,
  signal?: AbortSignal
): Promise<unknown> {
  if (!BASE_URL) {
    throw new Error('LLM base URL (VITE_LLM_BASE_URL) is not configured.');
  }

  const url = `${BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    
    // Check for common error patterns
    if (text.includes('exceeds the available context size')) {
      throw new Error(
        'The email is too long for the AI to process. Please try with a shorter email or contact.'
      );
    }
    
    throw new Error(
      `LLM request failed with status ${response.status}${
        text ? `: ${text.slice(0, 500)}` : ''
      }`
    );
  }

  return response.json() as Promise<unknown>;
}

class DefaultLlmClient implements LlmClient {
  async generateDraft(params: GenerateDraftParams): Promise<GeneratedDraft> {
    const { system, user } = buildDraftPrompt({
      lastEmailHtml: params.lastEmailHtml,
      contactName: params.contactName,
      senderName: params.senderName,
      daysSinceLastContact: params.daysSinceLastContact,
      contactCategory: params.contactCategory,
      totalEmailCount: params.totalEmailCount,
    });
  
    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 512,
      stream: false,
    };
  
    const raw = await callOpenAiCompatible(payload);
  
    const choice = (raw as any)?.choices?.[0];
    const content: string | undefined = choice?.message?.content;
  
    if (!content) {
      throw new Error('LLM response did not contain any content.');
    }
  
    const parsed = parseDraftResponse(content);
  
    return {
      subject: parsed.subject || 'Antwort auf Ihre Anfrage',
      bodyHtml: parsed.bodyHtml,
      bodyText: parsed.bodyText,
    };
  }
}

export const llmClient: LlmClient = new DefaultLlmClient();

