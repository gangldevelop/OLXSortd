import type { MsalClient } from '../auth/msalClient';

const DEBUG_GRAPH = import.meta.env.VITE_DEBUG_GRAPH === 'true';

export class GraphClient {
  private readonly msal: MsalClient;
  private readonly baseUrl: string;

  constructor(msal: MsalClient, baseUrl: string) {
    this.msal = msal;
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<T> {
    const token = await this.msal.getAccessToken();
    if (!token) throw new Error('No access token available');

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    } as Record<string, string>;

    const options: RequestInit = { method, headers };
    if (body && method === 'POST') options.body = JSON.stringify(body);

    const maxRetries = 5;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 || response.status === 503 || response.status === 504) {
          const retryAfter = Number(response.headers.get('Retry-After')) || Math.min(1000 * Math.pow(2, attempt), 10000);
          if (DEBUG_GRAPH) console.warn(`Graph throttled (${response.status}). Retrying in ${retryAfter}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, retryAfter));
          attempt++;
          continue;
        }
        if (!response.ok) throw new Error(`Graph API call failed: ${response.status} ${response.statusText}`);

        const status = response.status;
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type') || '';
        const hasBody = contentLength === null || contentLength === undefined || contentLength === '' || Number(contentLength) > 0;

        if (status === 202 || status === 204 || !hasBody) return undefined as unknown as T;
        if (contentType.includes('application/json')) return (await response.json()) as T;
        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          console.error('Graph API call failed:', error);
          throw error;
        }
        const backoff = Math.min(500 * Math.pow(2, attempt), 5000);
        if (DEBUG_GRAPH) console.warn(`Graph call error. Retrying in ${backoff}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, backoff));
        attempt++;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Graph API call failed');
  }
}


