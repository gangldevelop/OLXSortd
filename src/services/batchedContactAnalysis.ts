import { ProgressTracker, type ProgressUpdate } from './progressTracker';
// Vite worker constructor import (bundles dependencies automatically)
// @ts-ignore
import AnalysisWorker from './workers/contactAnalysisWorker.ts?worker';
import type { ContactWithAnalysis } from '../types/contact';
import type { EmailInteraction } from '../types/contact';

export interface BatchedAnalysisOptions {
  batchSize?: number;
  maxConcurrentBatches?: number;
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

type SerializableInteraction = {
  id: string;
  contactId: string;
  subject: string;
  date: number;
  direction: 'sent' | 'received';
  isRead: boolean;
  isReplied: boolean;
  threadId?: string;
};

type WorkerJobPayload = {
  contacts: Array<{ id: string; name: string; email: string }>;
  chunkSize: number;
};

type WorkerTask = {
  jobId: string;
  payload: WorkerJobPayload;
  resolve: (value: ContactWithAnalysis[]) => void;
  reject: (reason: Error) => void;
  onProgress?: (processed: number, total: number) => void;
};

type WorkerWrapper = {
  worker: Worker;
  busy: boolean;
  ready: boolean;
  currentTask?: WorkerTask;
};

class WorkerPool {
  private readonly workers: WorkerWrapper[] = [];
  private readonly queue: WorkerTask[] = [];
  private readonly maxWorkers: number;
  private readonly serializedInteractions: Record<string, SerializableInteraction[]>;

  constructor(
    maxWorkers: number,
    serializedInteractions: Record<string, SerializableInteraction[]>
  ) {
    this.maxWorkers = maxWorkers;
    this.serializedInteractions = serializedInteractions;
  }

  runJob(
    jobId: string,
    payload: WorkerJobPayload,
    onProgress?: (processed: number, total: number) => void
  ): Promise<ContactWithAnalysis[]> {
    return new Promise<ContactWithAnalysis[]>((resolve, reject) => {
      this.queue.push({ jobId, payload, resolve, reject, onProgress });
      this.processQueue();
    });
  }

  async destroy(): Promise<void> {
    while (this.queue.length > 0) {
      const pending = this.queue.shift();
      pending?.reject(new Error('Worker pool destroyed'));
    }

    await Promise.all(
      this.workers.map(async wrapper => {
        if (wrapper.currentTask) {
          wrapper.currentTask.reject(new Error('Worker pool destroyed'));
          wrapper.currentTask = undefined;
        }
        wrapper.worker.terminate();
      })
    );

    this.workers.splice(0, this.workers.length);
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      const wrapper = this.getAvailableWorker();
      if (!wrapper) {
        break;
      }

      const task = this.queue.shift();
      if (!task) {
        return;
      }

      this.startTask(wrapper, task);
    }
  }

  private startTask(wrapper: WorkerWrapper, task: WorkerTask): void {
    wrapper.busy = true;
    wrapper.currentTask = task;

    const messageHandler = (event: MessageEvent) => {
      const data = event.data as
        | { type: 'ready' }
        | { jobId: string; type: 'progress'; processed?: number; total?: number }
        | { jobId: string; type: 'result'; analyzedContacts?: ContactWithAnalysis[] };

      if (!data) {
        return;
      }

      if (data.type === 'ready') {
        wrapper.ready = true;
        if (!wrapper.busy) {
          this.processQueue();
        }
        return;
      }

      if (!('jobId' in data) || data.jobId !== task.jobId) {
        return;
      }

      if (data.type === 'progress') {
        task.onProgress?.(data.processed ?? 0, data.total ?? task.payload.contacts.length);
        return;
      }

      if (data.type === 'result') {
        wrapper.worker.removeEventListener('message', messageHandler);
        wrapper.worker.removeEventListener('error', errorHandler);
        wrapper.busy = false;
        wrapper.currentTask = undefined;
        try {
          task.resolve(data.analyzedContacts ?? []);
        } catch (error) {
          task.reject(error as Error);
        }
        this.processQueue();
      }
    };

    const errorHandler = (event: ErrorEvent) => {
      wrapper.worker.removeEventListener('message', messageHandler);
      wrapper.worker.removeEventListener('error', errorHandler);
      wrapper.busy = false;
      wrapper.currentTask = undefined;
      task.reject(event.error || new Error(event.message));
      this.processQueue();
    };

    wrapper.worker.addEventListener('message', messageHandler);
    wrapper.worker.addEventListener('error', errorHandler);

    wrapper.worker.postMessage({ type: 'job', jobId: task.jobId, ...task.payload });
  }

  private getAvailableWorker(): WorkerWrapper | undefined {
    const idleWorker = this.workers.find(wrapper => wrapper.ready && !wrapper.busy);
    if (idleWorker) {
      return idleWorker;
    }

    if (this.workers.length >= this.maxWorkers) {
      return undefined;
    }

    this.createWorker();
    return undefined;
  }

  private createWorker(): void {
    const worker = new (AnalysisWorker as unknown as { new (): Worker })();
    const wrapper: WorkerWrapper = { worker, busy: true, ready: false };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string };
      if (data?.type === 'ready') {
        worker.removeEventListener('message', onMessage);
        wrapper.ready = true;
        wrapper.busy = false;
        this.processQueue();
      }
    };

    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'init', interactionsByContact: this.serializedInteractions });

    this.workers.push(wrapper);
  }
}

export class BatchedContactAnalysis {
  private progressTracker: ProgressTracker;

  constructor() {
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Analyze contacts in batches for better performance with large datasets
   */
  async analyzeContactsInBatches(
    contacts: Array<{ id: string; name: string; email: string }>,
    emailInteractions: EmailInteraction[],
    options: BatchedAnalysisOptions = {}
  ): Promise<ContactWithAnalysis[]> {
    const {
      batchSize = 150,      // Increased from 100
      maxConcurrentBatches = 6,  // Increased from 3
      onProgress,
      onComplete,
      onError
    } = options;

    // Set up progress tracking
    this.progressTracker = new ProgressTracker({
      onProgress,
      onComplete,
      onError
    });

    let workerPool: WorkerPool | null = null;
    const metrics = { startTime: performance.now(), stages: new Map<string, number>() };

    try {
      const totalContacts = contacts.length;
      const totalBatches = Math.ceil(totalContacts / batchSize);
      
      this.progressTracker.start(4, 'preparing_analysis'); // 4 stages: prepare, analyze, finalize, complete
      
      console.log(`Starting batched analysis: ${totalContacts} contacts in ${totalBatches} batches of ${batchSize}`);
      
      // Immediately show initial progress
      this.progressTracker.updateStageProgress('preparing_analysis', 0, 1, `Starting analysis of ${totalContacts.toLocaleString()} contacts...`);

      // Stage 1: Prepare analysis
      this.progressTracker.updateStageProgress('preparing_analysis', 0, 1, 'Preparing contact analysis...');
      
      const prepStart = performance.now();
      
      // Group email interactions by contact for faster lookup
      const interactionsByContact = new Map<string, EmailInteraction[]>();
      let processedInteractions = 0;
      const totalInteractions = emailInteractions.length;
      
      emailInteractions.forEach((interaction, index) => {
        if (!interactionsByContact.has(interaction.contactId)) {
          interactionsByContact.set(interaction.contactId, []);
        }
        interactionsByContact.get(interaction.contactId)!.push(interaction);
        
        processedInteractions++;
        if (index % 1000 === 0 || index === totalInteractions - 1) {
          this.progressTracker.updateStageProgress(
            'preparing_analysis', 
            processedInteractions, 
            totalInteractions, 
            `Processing ${processedInteractions.toLocaleString()} / ${totalInteractions.toLocaleString()} email interactions...`
          );
        }
      });

      const serializeStart = performance.now();
      const serializedInteractionsByContact: Record<string, SerializableInteraction[]> = {};
      interactionsByContact.forEach((interactionList, contactId) => {
        serializedInteractionsByContact[contactId] = interactionList.map(interaction => ({
          id: interaction.id,
          contactId: interaction.contactId,
          subject: interaction.subject,
          date: interaction.date.getTime(),
          direction: interaction.direction,
          isRead: interaction.isRead,
          isReplied: interaction.isReplied,
          threadId: interaction.threadId,
        }));
      });

      metrics.stages.set('serialization_ms', performance.now() - serializeStart);
      metrics.stages.set('prep_ms', performance.now() - prepStart);

      this.progressTracker.completeStage('preparing_analysis', `Analysis preparation complete - ${interactionsByContact.size} contacts with interactions`);

      // Stage 2: Analyze contacts in batches
      this.progressTracker.updateStageProgress('analyzing_contacts', 0, totalContacts, 'Starting contact analysis...');
      
      const analyzedContacts: ContactWithAnalysis[] = [];
      const batches: Array<{ id: string; name: string; email: string }[]> = [];

      for (let i = 0; i < totalContacts; i += batchSize) {
        batches.push(contacts.slice(i, i + batchSize));
      }

      console.log(`Created ${batches.length} batches of size ${batchSize}`);

      this.progressTracker.updateStageProgress('analyzing_contacts', 0, totalContacts, `Starting analysis of ${totalContacts.toLocaleString()} contacts...`);

      let processedContacts = 0;
      let completedBatches = 0;
      const jobProgress = new Map<string, number>();
      const analysisStart = performance.now();

      workerPool = new WorkerPool(maxConcurrentBatches, serializedInteractionsByContact);

      const batchPromises = batches.map((batch, index) => {
        const jobId = `batch-${index}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        const dynamicChunkSize = this.calculateOptimalChunkSize(batch.length);
        const payload: WorkerJobPayload = {
          contacts: batch,
          chunkSize: dynamicChunkSize
        };

        return workerPool!
          .runJob(jobId, payload, (processed) => {
            const previous = jobProgress.get(jobId) ?? 0;
            const delta = Math.max(0, processed - previous);
            if (delta === 0) {
              return;
            }

            jobProgress.set(jobId, processed);
            processedContacts = Math.min(totalContacts, processedContacts + delta);

            this.progressTracker.updateStageProgress(
              'analyzing_contacts',
              processedContacts,
              totalContacts,
              `Analyzing ${processedContacts.toLocaleString()} / ${totalContacts.toLocaleString()} contacts...`
            );
          })
          .then(result => {
            const previous = jobProgress.get(jobId) ?? 0;
            if (previous < batch.length) {
              const delta = batch.length - previous;
              processedContacts = Math.min(totalContacts, processedContacts + delta);
            }

            jobProgress.set(jobId, batch.length);
            completedBatches += 1;

            this.progressTracker.updateStageProgress(
              'analyzing_contacts',
              processedContacts,
              totalContacts,
              `Analyzed ${processedContacts.toLocaleString()} / ${totalContacts.toLocaleString()} contacts (${completedBatches}/${batches.length} batches)...`
            );

            return result;
          });
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        analyzedContacts.push(...result);
      });

      metrics.stages.set('analysis_ms', performance.now() - analysisStart);

      processedContacts = analyzedContacts.length;

      console.log(`Processed ${processedContacts} contacts (${batches.length} batches, max ${maxConcurrentBatches} concurrent)`);

      this.progressTracker.updateStageProgress(
        'analyzing_contacts',
        processedContacts,
        totalContacts,
        `Analyzed ${processedContacts.toLocaleString()} / ${totalContacts.toLocaleString()} contacts...`
      );

      this.progressTracker.completeStage('analyzing_contacts', 'Contact analysis complete');

      // Stage 3: Finalize results
      this.progressTracker.updateStageProgress('finalizing_results', 0, 1, 'Finalizing results...');
      
      const finalizeStart = performance.now();
      
      // Sort contacts by category and response rate for better UX
      analyzedContacts.sort((a, b) => {
        // Priority order: recent > in_touch > inactive
        const categoryOrder: Record<string, number> = { recent: 0, in_touch: 1, inactive: 2 };
        const aOrder = categoryOrder[a.category] ?? 99;
        const bOrder = categoryOrder[b.category] ?? 99;
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Within same category, sort by response rate (higher first)
        return b.responseRate - a.responseRate;
      });

      // Count contacts by category for summary
      const categoryCounts = analyzedContacts.reduce((acc, contact) => {
        acc[contact.category] = (acc[contact.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categorySummary = Object.entries(categoryCounts)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');

      metrics.stages.set('finalize_ms', performance.now() - finalizeStart);
      metrics.stages.set('total_ms', performance.now() - metrics.startTime);

      const timingDetails = Array.from(metrics.stages.entries())
        .map(([stage, ms]) => `${stage}: ${ms.toFixed(0)}ms`)
        .join(', ');
      console.log(`Performance metrics - ${timingDetails}`);

      this.progressTracker.completeStage('finalizing_results', `Results finalized - ${categorySummary}`);
      this.progressTracker.complete(`Analysis complete: ${analyzedContacts.length.toLocaleString()} contacts processed (${categorySummary})`);

      return analyzedContacts;

    } catch (error) {
      this.progressTracker.error(error as Error, 'Analysis failed');
      throw error;
    } finally {
      if (workerPool) {
        await workerPool.destroy();
      }
    }
  }

  /**
   * Get estimated time for analysis based on contact count
   */
  getEstimatedAnalysisTime(contactCount: number): number {
    // Rough estimates based on contact count
    if (contactCount < 100) return 10; // 10 seconds
    if (contactCount < 1000) return 30; // 30 seconds
    if (contactCount < 5000) return 120; // 2 minutes
    if (contactCount < 10000) return 300; // 5 minutes
    return 600; // 10 minutes for very large datasets
  }

  /**
   * Get recommended batch size based on contact count - optimized for performance
   */
  getRecommendedBatchSize(contactCount: number): number {
    if (contactCount < 100) return 25;
    if (contactCount < 200) return 50;
    if (contactCount < 500) return 75;
    if (contactCount < 2000) return 100;
    if (contactCount < 5000) return 150;
    if (contactCount < 10000) return 200;
    return 300; // For very large datasets (10k+)
  }

  private calculateOptimalChunkSize(batchSize: number): number {
    if (batchSize < 100) return 20;
    if (batchSize < 500) return 50;
    if (batchSize < 1000) return 100;
    if (batchSize < 2000) return 150;
    return 200;
  }
}
