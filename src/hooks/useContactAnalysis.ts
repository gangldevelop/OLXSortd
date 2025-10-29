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

      const [realContacts, realEmailInteractions] = await Promise.all([
        graphService.getContactsForAnalysis(analysisOptions),
        graphService.getEmailInteractionsForAnalysis(emailInteractionLimit),
      ]);

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

      // Background prefetch: warm last-email previews for top contacts to speed first open
      try {
        const topForPreview = analyzedContacts.slice(0, 20);
        // Light concurrency to avoid throttling
        const concurrency = 2;
        for (let i = 0; i < topForPreview.length; i += concurrency) {
          const chunk = topForPreview.slice(i, i + concurrency);
          // Fire and forget
          void Promise.all(
            chunk.map((c) => graphService.getLastEmailWithContact(c.email).catch(() => null))
          );
          // small gap to be gentle on Graph
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 100));
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


