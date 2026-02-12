import { buildDraftPrompt } from '../utils/llmPrompt';

export interface GenerateDraftParams {
  lastEmailHtml: string;
  contactName: string;
  senderName: string;
  language?: string;
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
      language: params.language ?? 'de',
    });

    const payload =
      PROVIDER === 'openai-compatible' || PROVIDER === 'managed'
        ? {
            model: MODEL,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.3,
            max_tokens: 400,
            stop: ["<|end|>", "<|endoftext|>", "\n\n\n"],
            stream: false,
          }
        : {
            model: MODEL,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.3,
            max_tokens: 400,
            stop: ["<|end|>", "<|endoftext|>", "\n\n\n"],
            stream: false,
          };

    const raw = await callOpenAiCompatible(payload);

    const choice = (raw as any)?.choices?.[0];
    const content: string | undefined = choice?.message?.content;

    if (!content) {
      throw new Error('LLM response did not contain any content.');
    }

    try {
      const parsed = JSON.parse(content) as Partial<GeneratedDraft>;

      if (!parsed.subject || !parsed.bodyHtml || !parsed.bodyText) {
        throw new Error('Parsed JSON is missing required fields.');
      }

      return {
        subject: parsed.subject,
        bodyHtml: parsed.bodyHtml,
        bodyText: parsed.bodyText,
      };
    } catch (error) {
      console.warn('Failed to parse LLM JSON content, falling back to simple mapping.', error);

      return {
        subject: 'Antwort auf Ihre letzte E‑Mail',
        bodyHtml: `<p>${content}</p>`,
        bodyText: content,
      };
    }
  }
}

export const llmClient: LlmClient = new DefaultLlmClient();

