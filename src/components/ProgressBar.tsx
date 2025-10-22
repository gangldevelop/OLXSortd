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
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Analyzing Contacts
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {progress.message}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
          <div 
            className={`h-4 rounded-full transition-all duration-200 ease-out ${getProgressColor(progress.progress)}`}
            style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }}
          />
        </div>

        {/* Progress Details */}
        <div className="flex justify-between items-center text-sm font-medium mb-4">
          <span className="text-gray-900">{Math.round(progress.progress)}%</span>
          {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
            <span className="text-gray-600">~{formatTime(progress.estimatedTimeRemaining)} remaining</span>
          )}
        </div>

        {/* Items Progress */}
        {progress.totalItems > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-gray-700 mb-2">Processing Status</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Items:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {progress.itemsProcessed.toLocaleString()} / {progress.totalItems.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Complete:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {progress.totalItems > 0 ? Math.round((progress.itemsProcessed / progress.totalItems) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stage Indicator */}
        <div className="text-xs">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              Current Stage: {progress.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-blue-700">
              {progress.stage === 'fetching_data' && (
                'Fetching contacts and email interactions from Microsoft Graph...'
              )}
              {progress.stage === 'preparing_analysis' && (
                'Processing email interactions and preparing contact data...'
              )}
              {progress.stage === 'analyzing_contacts' && (
                'Categorizing contacts and calculating response rates...'
              )}
              {progress.stage === 'finalizing_results' && (
                'Sorting contacts and generating summary...'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
