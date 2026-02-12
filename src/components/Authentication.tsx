import { useState, useEffect } from 'react';
import { graphService } from '../services/microsoftGraph';

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

      const account = graphService.getCurrentAccount();
      if (account) {
        try {
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
      const authResult = await graphService.signIn();

      if (!authResult) {
        throw new Error('Sign in failed - no authentication result');
      }

      const token = await graphService.getAccessToken();
      if (!token) {
        throw new Error('Failed to get access token after sign in');
      }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-400 border-r-blue-400/30"></div>
          </div>
          <p className="text-sm text-slate-400 tracking-wide">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40 p-8">
          {/* Logo / Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
              Connect to Outlook
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in with Microsoft to access your contacts and send emails.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <svg className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative w-full flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:bg-blue-500 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-blue-600 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                {/* Microsoft logo */}
                <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                <span>Sign in with Microsoft</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-6 border-t border-white/[0.06]"></div>

          {/* Permissions */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Permissions requested
            </p>
            <div className="space-y-2">
              {[
                { icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0', label: 'Profile information' },
                { icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z', label: 'Contacts' },
                { icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75', label: 'Email (read & send)' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                  <span className="text-sm text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-600">
          Secured by Microsoft Authentication
        </p>
      </div>
    </div>
  );
}