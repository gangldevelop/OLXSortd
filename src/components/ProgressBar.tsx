import type { ProgressUpdate } from '../services/progressTracker';

interface ProgressBarProps {
  progress: ProgressUpdate | null;
  isVisible: boolean;
}

export function ProgressBar({ progress, isVisible }: ProgressBarProps) {
  if (!isVisible) {
    return null;
  }

  // Show loading state if progress is null but isVisible is true
  if (!progress) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Analyzing Contacts
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Initializing analysis...
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div className="h-3 rounded-full bg-blue-400 animate-pulse" style={{ width: '30%' }} />
          </div>
          <div className="text-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Preparing contact analysis...
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 0) return 'bg-red-500';
    if (progress < 30) return 'bg-red-400';
    if (progress < 60) return 'bg-yellow-400';
    if (progress < 90) return 'bg-blue-400';
    return 'bg-green-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analyzing Contacts
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {progress.message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(progress.progress)}`}
            style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
          />
        </div>

        {/* Progress Details */}
        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
          <span>{progress.progress}% complete</span>
          {progress.estimatedTimeRemaining && (
            <span>~{formatTime(progress.estimatedTimeRemaining)} remaining</span>
          )}
        </div>

        {/* Items Progress */}
        {progress.totalItems > 0 && (
          <div className="text-xs text-gray-500 text-center mb-2">
            {progress.itemsProcessed.toLocaleString()} / {progress.totalItems.toLocaleString()} items processed
          </div>
        )}

        {/* Stage Indicator */}
        <div className="text-xs text-gray-500 text-center">
          <div className="font-medium text-gray-700 mb-1">
            Stage: {progress.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          {progress.stage === 'fetching_data' && (
            <div>Fetching contacts and email interactions from Microsoft Graph...</div>
          )}
          {progress.stage === 'preparing_analysis' && (
            <div>Processing email interactions and preparing contact data...</div>
          )}
          {progress.stage === 'analyzing_contacts' && (
            <div>Categorizing contacts and calculating response rates...</div>
          )}
          {progress.stage === 'finalizing_results' && (
            <div>Sorting contacts and generating summary...</div>
          )}
        </div>
      </div>
    </div>
  );
}
