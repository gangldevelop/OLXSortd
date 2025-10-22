/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />
import { ContactAnalysisService } from '../contactAnalysisService';
import type { EmailInteraction } from '../../types/contact';

type WorkerRequest = {
  jobId: string;
  contacts: Array<{ id: string; name: string; email: string }>;
  interactionsByContact: Record<string, Array<{
    id: string;
    contactId: string;
    subject: string;
    date: string | number;
    direction: 'sent' | 'received';
    isRead: boolean;
    isReplied: boolean;
    threadId?: string;
  }>>;
  chunkSize: number;
};

type WorkerProgress = {
  jobId: string;
  type: 'progress';
  processed: number;
  total: number;
};

type WorkerResult = {
  jobId: string;
  type: 'result';
  analyzedContacts: Array<any>;
};

const service = new ContactAnalysisService();

const toInteractionMap = (input: WorkerRequest['interactionsByContact']): Map<string, EmailInteraction[]> => {
  const map = new Map<string, EmailInteraction[]>();
  for (const [key, arr] of Object.entries(input)) {
    map.set(
      key,
      arr.map(i => ({
        ...i,
        date: new Date(i.date),
      })) as EmailInteraction[]
    );
  }
  return map;
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { jobId, contacts, interactionsByContact, chunkSize } = e.data;
  const map = toInteractionMap(interactionsByContact);

  const total = contacts.length;
  let processed = 0;
  const analyzedContacts: any[] = [];

  const size = Math.max(10, chunkSize || 50);
  for (let start = 0; start < contacts.length; start += size) {
    const sub = contacts.slice(start, start + size);
    const analyzed = service.analyzeContactsWithGroupedInteractions(sub, map);
    analyzedContacts.push(...analyzed);
    processed += sub.length;
    const progress: WorkerProgress = { jobId, type: 'progress', processed, total };
    (self as unknown as Worker)['postMessage'](progress);
    // Yield
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const result: WorkerResult = { jobId, type: 'result', analyzedContacts };
  (self as unknown as Worker)['postMessage'](result);
};


