/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />
import { ContactAnalysisService } from '../contactAnalysisService';
import type { EmailInteraction } from '../../types/contact';

type SerializableInteraction = {
  id: string;
  contactId: string;
  subject: string;
  date: number | string;
  direction: 'sent' | 'received';
  isRead: boolean;
  isReplied: boolean;
  threadId?: string;
};

type WorkerInitMessage = {
  type: 'init';
  interactionsByContact: Record<string, SerializableInteraction[]>;
};

type WorkerJobMessage = {
  type: 'job';
  jobId: string;
  contacts: Array<{ id: string; name: string; email: string }>;
  chunkSize: number;
};

type WorkerRequest = WorkerInitMessage | WorkerJobMessage;

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

const toInteractionMap = (input: Record<string, SerializableInteraction[]>): Map<string, EmailInteraction[]> => {
  const map = new Map<string, EmailInteraction[]>();
  for (const [key, arr] of Object.entries(input)) {
    map.set(
      key,
      arr.map(interaction => ({
        ...interaction,
        date: new Date(interaction.date),
      })) as EmailInteraction[]
    );
  }
  return map;
};

let interactionsByContact: Map<string, EmailInteraction[]> | null = null;

const buildContactInteractionMap = (
  contacts: Array<{ id: string }>,
  source: Map<string, EmailInteraction[]>
): Map<string, EmailInteraction[]> => {
  const map = new Map<string, EmailInteraction[]>();
  contacts.forEach(contact => {
    map.set(contact.id, source.get(contact.id) ?? []);
  });
  return map;
};

const handleJob = async ({ jobId, contacts, chunkSize }: WorkerJobMessage) => {
  if (!interactionsByContact) {
    throw new Error('Worker not initialized');
  }

  const jobStart = performance.now();
  const map = buildContactInteractionMap(contacts, interactionsByContact);
  const mapTime = performance.now() - jobStart;

  const total = contacts.length;
  let processed = 0;
  const analyzedContacts: any[] = [];

  const size = Math.max(10, chunkSize || 50);
  const maxIterationsBeforeYield = 5;
  let iterationsSinceYield = 0;
  const analysisStart = performance.now();

  for (let start = 0; start < contacts.length; start += size) {
    const sub = contacts.slice(start, start + size);
    const analyzed = service.analyzeContactsWithGroupedInteractions(sub, map);
    analyzedContacts.push(...analyzed);
    processed += sub.length;
    
    const progress: WorkerProgress = { jobId, type: 'progress', processed, total };
    (self as unknown as Worker)['postMessage'](progress);
    
    iterationsSinceYield++;
    if (iterationsSinceYield >= maxIterationsBeforeYield) {
      iterationsSinceYield = 0;
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const analysisTime = performance.now() - analysisStart;
  const result: WorkerResult = { jobId, type: 'result', analyzedContacts };
  (self as unknown as Worker)['postMessage'](result);
  
  if (total > 0) {
    const timePerContact = analysisTime / total;
    console.log(`[Worker ${jobId}] Analyzed ${total} contacts in ${analysisTime.toFixed(0)}ms (${timePerContact.toFixed(1)}ms/contact, map: ${mapTime.toFixed(0)}ms)`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-misused-promises
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;

  if (!data) {
    return;
  }

  if (data.type === 'init') {
    interactionsByContact = toInteractionMap(data.interactionsByContact);
    (self as unknown as Worker)['postMessage']({ type: 'ready' });
    return;
  }

  await handleJob(data);
};


