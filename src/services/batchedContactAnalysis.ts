import { ContactAnalysisService } from './contactAnalysisService';
import { ProgressTracker, type ProgressUpdate } from './progressTracker';
import type { ContactWithAnalysis } from '../types/contact';
import type { EmailInteraction } from '../types/contact';

export interface BatchedAnalysisOptions {
  batchSize?: number;
  maxConcurrentBatches?: number;
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class BatchedContactAnalysis {
  private analysisService: ContactAnalysisService;
  private progressTracker: ProgressTracker;

  constructor() {
    this.analysisService = new ContactAnalysisService();
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
      batchSize = 100,
      maxConcurrentBatches = 3,
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

    try {
      const totalContacts = contacts.length;
      const totalBatches = Math.ceil(totalContacts / batchSize);
      
      this.progressTracker.start(4, 'preparing_analysis'); // 4 stages: prepare, analyze, finalize, complete
      
      console.log(`Starting batched analysis: ${totalContacts} contacts in ${totalBatches} batches of ${batchSize}`);
      
      // Immediately show initial progress
      this.progressTracker.updateStageProgress('preparing_analysis', 0, 1, `Starting analysis of ${totalContacts.toLocaleString()} contacts...`);

      // Stage 1: Prepare analysis
      this.progressTracker.updateStageProgress('preparing_analysis', 0, 1, 'Preparing contact analysis...');
      
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

      this.progressTracker.completeStage('preparing_analysis', `Analysis preparation complete - ${interactionsByContact.size} contacts with interactions`);

      // Stage 2: Analyze contacts in batches
      this.progressTracker.updateStageProgress('analyzing_contacts', 0, totalBatches, 'Analyzing contacts...');
      
      const analyzedContacts: ContactWithAnalysis[] = [];
      const batches: Array<{ id: string; name: string; email: string }[]> = [];

      // Create batches
      for (let i = 0; i < totalContacts; i += batchSize) {
        batches.push(contacts.slice(i, i + batchSize));
      }

      // Process batches with concurrency control
      for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
        const currentBatches = batches.slice(i, i + maxConcurrentBatches);
        
        // Process batches in parallel
        const batchPromises = currentBatches.map(async (batch) => {
          const batchContacts: ContactWithAnalysis[] = [];
          
          for (const contact of batch) {
            const contactInteractions = interactionsByContact.get(contact.id) || [];
            const analysis = this.analysisService.analyzeContacts([contact], contactInteractions);
            batchContacts.push(...analysis);
          }
          
          return batchContacts;
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Flatten results and add to main array
        batchResults.forEach(result => {
          analyzedContacts.push(...result);
        });

        // Update progress
        const processedBatches = Math.min(i + maxConcurrentBatches, batches.length);
        this.progressTracker.updateStageProgress(
          'analyzing_contacts',
          processedBatches,
          totalBatches,
          `Analyzed ${analyzedContacts.length.toLocaleString()} / ${totalContacts.toLocaleString()} contacts (${processedBatches}/${totalBatches} batches)...`
        );

        // Small delay to prevent overwhelming the system
        if (i + maxConcurrentBatches < batches.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.progressTracker.completeStage('analyzing_contacts', 'Contact analysis complete');

      // Stage 3: Finalize results
      this.progressTracker.updateStageProgress('finalizing_results', 0, 1, 'Finalizing results...');
      
      // Sort contacts by category and response rate for better UX
      analyzedContacts.sort((a, b) => {
        // Priority order: hot > frequent > warm > inactive > cold
        const categoryOrder = { hot: 0, frequent: 1, warm: 2, inactive: 3, cold: 4 };
        const aOrder = categoryOrder[a.category] ?? 5;
        const bOrder = categoryOrder[b.category] ?? 5;
        
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

      this.progressTracker.completeStage('finalizing_results', `Results finalized - ${categorySummary}`);
      this.progressTracker.complete(`Analysis complete: ${analyzedContacts.length.toLocaleString()} contacts processed (${categorySummary})`);

      return analyzedContacts;

    } catch (error) {
      this.progressTracker.error(error as Error, 'Analysis failed');
      throw error;
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
   * Get recommended batch size based on contact count
   */
  getRecommendedBatchSize(contactCount: number): number {
    if (contactCount < 500) return 50;
    if (contactCount < 2000) return 100;
    if (contactCount < 10000) return 200;
    return 500; // For very large datasets
  }
}
