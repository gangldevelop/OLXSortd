import { useState } from 'react';
import { BatchedContactAnalysis } from '../services/batchedContactAnalysis';
import { graphService } from '../services/microsoftGraph';
import type { ContactWithAnalysis } from '../types/contact';
import type { ProgressUpdate } from '../services/progressTracker';

type AnalysisMode = 'quick' | 'balanced' | 'comprehensive';

export function useContactAnalysis(onContactsAnalyzed: (contacts: ContactWithAnalysis[]) => void) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);

  const analyzeContacts = async (mode: AnalysisMode = 'quick') => {
    const batchedAnalysis = new BatchedContactAnalysis();
    setIsAnalyzing(true);
    setProgress({
      stage: 'preparing_analysis',
      progress: 0,
      message: 'Initializing analysis...',
      itemsProcessed: 0,
      totalItems: 0,
    });

    try {
      await graphService.debugAuthStatus();

      const token = await graphService.getAccessToken();
      if (!token) {
        throw new Error('No access token available. Please sign in again.');
      }

      let analysisOptions: { quickMode?: boolean; useAllEmails?: boolean; maxEmails?: number };
      let emailInteractionLimit: number;

      switch (mode) {
        case 'quick':
          analysisOptions = { quickMode: true };
          emailInteractionLimit = 200;
          break;
        case 'comprehensive':
        default:
          analysisOptions = { useAllEmails: true, maxEmails: 50000 };
          emailInteractionLimit = 50000;
      }

      setProgress({
        stage: 'preparing_analysis',
        progress: 5,
        message: 'Fetching contacts and emails from Microsoft Graph...',
        itemsProcessed: 0,
        totalItems: 0,
      });

      const graphStart = performance.now();
      const contactsStart = performance.now();
      const contacts = await graphService.getContactsForAnalysis(analysisOptions);
      const contactsTime = performance.now() - contactsStart;
      
      const emailsStart = performance.now();
      const emailInteractions = await graphService.getEmailInteractionsForAnalysis(emailInteractionLimit);
      const emailsTime = performance.now() - emailsStart;
      
      const graphTotalTime = performance.now() - graphStart;

      console.log(`Graph API Timing:
  - Fetch contacts: ${contactsTime.toFixed(0)}ms (${contacts.length} contacts)
  - Fetch emails: ${emailsTime.toFixed(0)}ms (${emailInteractions.length} interactions)
  - Total Graph: ${graphTotalTime.toFixed(0)}ms`);

      const [realContacts, realEmailInteractions] = [contacts, emailInteractions];

      setProgress({
        stage: 'preparing_analysis',
        progress: 10,
        message: `Found ${realContacts.length} contacts and ${realEmailInteractions.length} email interactions. Starting analysis...`,
        itemsProcessed: 0,
        totalItems: realContacts.length,
      });

      const batchSize = batchedAnalysis.getRecommendedBatchSize(realContacts.length);
      const maxConcurrent = realContacts.length > 5000 ? 4 : realContacts.length > 1000 ? 3 : 2;

      const analyzedContacts = await batchedAnalysis.analyzeContactsInBatches(realContacts, realEmailInteractions, {
        batchSize,
        maxConcurrentBatches: maxConcurrent,
        onProgress: (update) => setProgress(update),
        onComplete: () => {},
        onError: (error) => {
          throw error;
        },
      });

      onContactsAnalyzed(analyzedContacts);

      setProgress({
        stage: 'finalizing_results',
        progress: 100,
        message: `Analysis complete! Processed ${analyzedContacts.length} contacts.`,
        itemsProcessed: analyzedContacts.length,
        totalItems: analyzedContacts.length,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Optional background prefetch (disabled by default to reduce 429s)
      try {
        if (import.meta.env.VITE_PREFETCH_LAST_EMAIL === 'true') {
          const topForPreview = analyzedContacts.slice(0, 10);
          const concurrency = 1;
          for (let i = 0; i < topForPreview.length; i += concurrency) {
            const chunk = topForPreview.slice(i, i + concurrency);
            void Promise.all(
              chunk.map((c) => graphService.getLastEmailWithContact(c.email).catch(() => null))
            );
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      } catch {}
    } catch (error) {
      console.error('Failed to analyze contacts:', error);
      alert(`Failed to load your contacts and emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  return { analyzeContacts, isAnalyzing, progress } as const;
}


