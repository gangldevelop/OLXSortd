import { PublicClientApplication } from '@azure/msal-browser';
import type { AuthenticationResult, AccountInfo } from '@azure/msal-browser';

const DEBUG_GRAPH = import.meta.env.VITE_DEBUG_GRAPH === 'true';

export interface GraphAuthConfig {
  clientId: string;
  authority: string;
  redirectUri: string;
  scopes: string[];
}

export class MsalClient {
  private msalInstance: PublicClientApplication;
  private config: GraphAuthConfig;

  constructor(config: GraphAuthConfig) {
    this.config = config;
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority,
        redirectUri: this.config.redirectUri,
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
      },
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      if (DEBUG_GRAPH) console.log('MSAL initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MSAL:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    try {
      this.msalInstance.getAllAccounts();
    } catch (error) {
      if (error instanceof Error && error.message.includes('uninitialized_public_client_application')) {
        if (DEBUG_GRAPH) console.log('MSAL not initialized, initializing now...');
        await this.initialize();
      } else {
        throw error;
      }
    }
  }

  async signIn(): Promise<AuthenticationResult | null> {
    try {
      await this.ensureInitialized();
      const loginRequest = {
        scopes: this.config.scopes,
        prompt: 'select_account' as const,
      };
      const response = await this.msalInstance.loginPopup(loginRequest);
      if (DEBUG_GRAPH) console.log('User signed in successfully');
      return response;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await this.msalInstance.logoutPopup({ account: accounts[0] });
        if (DEBUG_GRAPH) console.log('User signed out successfully');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  getCurrentAccount(): AccountInfo | null {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }

  async getAccessToken(): Promise<string | null> {
    try {
      await this.ensureInitialized();
      const accounts = this.msalInstance.getAllAccounts();
      if (DEBUG_GRAPH) console.log(`Found ${accounts.length} accounts`);
      if (accounts.length === 0) {
        if (DEBUG_GRAPH) console.log('No accounts found, user needs to sign in');
        return null;
      }
      const silentRequest = {
        scopes: this.config.scopes,
        account: accounts[0],
      };
      if (DEBUG_GRAPH) console.log('Attempting to acquire token silently...');
      const response = await this.msalInstance.acquireTokenSilent(silentRequest);
      if (DEBUG_GRAPH) console.log('Token acquired successfully');
      return response.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      try {
        if (DEBUG_GRAPH) console.log('Attempting interactive login...');
        const response = await this.signIn();
        return response?.accessToken || null;
      } catch (loginError) {
        console.error('Interactive login failed:', loginError);
        return null;
      }
    }
  }

  async debugAuthStatus(): Promise<void> {
    if (!DEBUG_GRAPH) return;
    console.log('=== AUTH DEBUG INFO ===');
    console.log('MSAL Instance initialized:', true);
    console.log('Config:', this.config);
    const accounts = this.msalInstance.getAllAccounts();
    console.log('Accounts found:', accounts.length);
    if (accounts.length > 0) {
      console.log('Current account:', accounts[0].username);
      try {
        const token = await this.getAccessToken();
        console.log('Access token available:', !!token);
        if (token) console.log('Token length:', token.length);
      } catch (error) {
        console.log('Token acquisition failed:', error);
      }
    }
    console.log('=== END AUTH DEBUG ===');
  }
}


