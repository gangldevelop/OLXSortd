import { useState, useEffect } from 'react';
import { graphService } from '../services/microsoftGraphService';

interface AuthenticationProps {
  onAuthenticated: (user: { displayName: string; mail: string; id: string }) => void;
}

export function Authentication({ onAuthenticated }: AuthenticationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeAuth = async () => {
    try {
      await graphService.initialize();
      setIsInitialized(true);
      
      // Check if user is already signed in
      const account = graphService.getCurrentAccount();
      if (account) {
        try {
          // Ensure we have a valid access token
          const token = await graphService.getAccessToken();
          if (token) {
            const user = await graphService.getCurrentUser();
            onAuthenticated(user);
          } else {
            console.log('No valid token found, user needs to sign in again');
          }
        } catch (error) {
          console.log('User session expired, need to sign in again:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      setError('Failed to initialize authentication');
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in and get the authentication result
      const authResult = await graphService.signIn();
      
      if (!authResult) {
        throw new Error('Sign in failed - no authentication result');
      }
      
      // Ensure we have an access token before proceeding
      const token = await graphService.getAccessToken();
      if (!token) {
        throw new Error('Failed to get access token after sign in');
      }
      
      // Get user info with the access token
      const user = await graphService.getCurrentUser();
      onAuthenticated(user);
    } catch (error) {
      console.error('Sign in failed:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border p-6 text-center">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Connect to Outlook
        </h2>
        <p className="text-sm text-gray-600">
          Sign in with your Microsoft account to access your contacts and send emails.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          'Sign in with Microsoft'
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500">
        <p>This app will access:</p>
        <ul className="mt-1 space-y-1">
          <li>• Your profile information</li>
          <li>• Your contacts</li>
          <li>• Your email (read & send)</li>
        </ul>
      </div>
    </div>
  );
}
