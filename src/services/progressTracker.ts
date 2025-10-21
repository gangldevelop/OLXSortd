export interface ProgressUpdate {
  stage: string;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
  itemsProcessed: number;
  totalItems: number;
}

export interface ProgressTrackerOptions {
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class ProgressTracker {
  private options: ProgressTrackerOptions;
  private startTime: number = 0;
  private stageStartTime: number = 0;
  private currentStage: string = '';
  private totalStages: number = 0;
  private completedStages: number = 0;

  constructor(options: ProgressTrackerOptions = {}) {
    this.options = options;
  }

  /**
   * Start tracking progress for a multi-stage process
   */
  start(totalStages: number, initialStage: string) {
    this.startTime = Date.now();
    this.stageStartTime = Date.now();
    this.totalStages = totalStages;
    this.completedStages = 0;
    this.currentStage = initialStage;
    
    this.updateProgress(0, `Starting ${initialStage}...`, 0, 0, 0);
  }

  /**
   * Update progress for current stage
   */
  updateStageProgress(
    stage: string,
    itemsProcessed: number,
    totalItems: number,
    message?: string
  ) {
    if (stage !== this.currentStage) {
      this.completedStages++;
      this.stageStartTime = Date.now();
      this.currentStage = stage;
      console.log(`ProgressTracker: Starting new stage "${stage}" (completed stages: ${this.completedStages}/${this.totalStages})`);
    }

    const stageProgress = totalItems > 0 ? (itemsProcessed / totalItems) * 100 : 0;
    const overallProgress = ((this.completedStages + (stageProgress / 100)) / this.totalStages) * 100;
    
    const estimatedTimeRemaining = this.calculateEstimatedTime(overallProgress);
    
    console.log(`ProgressTracker: Stage "${stage}" - ${itemsProcessed}/${totalItems} (${Math.round(stageProgress)}%) - Overall: ${Math.round(overallProgress)}%`);
    
    this.updateProgress(
      Math.round(overallProgress),
      message || `${stage}: ${itemsProcessed}/${totalItems}`,
      estimatedTimeRemaining,
      itemsProcessed,
      totalItems
    );
  }

  /**
   * Complete a stage
   */
  completeStage(stage: string, message?: string) {
    this.completedStages++;
    const overallProgress = (this.completedStages / this.totalStages) * 100;
    
    this.updateProgress(
      Math.round(overallProgress),
      message || `Completed ${stage}`,
      0,
      0,
      0
    );
  }

  /**
   * Complete the entire process
   */
  complete(message?: string) {
    const totalTime = Date.now() - this.startTime;
    this.updateProgress(
      100,
      message || `Analysis completed in ${Math.round(totalTime / 1000)}s`,
      0,
      0,
      0
    );
    
    if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  /**
   * Report an error
   */
  error(error: Error, message?: string) {
    this.updateProgress(
      -1, // Error state
      message || `Error: ${error.message}`,
      0,
      0,
      0
    );
    
    if (this.options.onError) {
      this.options.onError(error);
    }
  }

  /**
   * Calculate estimated time remaining based on current progress
   */
  private calculateEstimatedTime(progress: number): number {
    if (progress <= 0) return 0;
    
    const elapsedTime = Date.now() - this.startTime;
    const estimatedTotalTime = (elapsedTime / progress) * 100;
    const remainingTime = estimatedTotalTime - elapsedTime;
    
    return Math.max(0, Math.round(remainingTime / 1000));
  }

  /**
   * Update progress and notify listeners
   */
  private updateProgress(
    progress: number,
    message: string,
    estimatedTimeRemaining: number,
    itemsProcessed: number,
    totalItems: number
  ) {
    const update: ProgressUpdate = {
      stage: this.currentStage,
      progress,
      message,
      estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined,
      itemsProcessed,
      totalItems
    };

    console.log(`ProgressTracker: Calling onProgress with update:`, update);
    if (this.options.onProgress) {
      this.options.onProgress(update);
    } else {
      console.warn('ProgressTracker: No onProgress callback provided');
    }
  }
}
