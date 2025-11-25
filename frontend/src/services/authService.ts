import api from './api';
import { User, AuthResponse } from '../types/user';

const TOKEN_KEY = 'auth_token';

// Get the current auth token from localStorage
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Set the auth token in localStorage and configure axios
// Initialize auth state when the module loads
const initializeAuth = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    // Set the token in axios defaults
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Initialize auth state
initializeAuth();

export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('isAuthenticated', 'true');
    // Update axios defaults
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    // Clear token from localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('isAuthenticated');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const clearAuthState = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('isAuthenticated');
};

// Get backend API base URL - OAuth endpoints must point to backend, not frontend
const getBackendBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
};

let authCheckInProgress: Promise<User | null> | null = null;

export const authService = {
  /**
   * Check current authentication status
   */
  checkAuth: async (force = false): Promise<User | null> => {
    // If already checking, return the existing promise
    if (authCheckInProgress && !force) {
      return authCheckInProgress;
    }
    
    // First check if we have a token
    const token = getToken();
    if (!token) {
      // Ensure we clear any existing auth state if no token
      clearAuthState();
      return null;
    }
    
    // Ensure the token is set in axios defaults
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Create a new promise that will handle the auth check
    authCheckInProgress = (async (): Promise<User | null> => {
      try {
        // Token exists, verify it with the server
        const response = await api.get<User>('/api/auth/me', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          params: { _: new Date().getTime() },
          timeout: 10000
        });
        
        if (response.data) {
          return response.data;
        }
        
        // No user data in response
        throw new Error('No user data received');
      } catch (error) {
        const axiosError = error as {
          response?: { status: number };
          code?: string;
          message: string;
        };
        
        // 401 is expected when user is not logged in - don't log as error
        const isUnauthorized = axiosError.response?.status === 401;
        const isNetworkError = !axiosError.response || 
                             axiosError.code === 'ECONNABORTED' || 
                             axiosError.code === 'ERR_NETWORK';
        
        if (isUnauthorized) {
          console.log('[Auth] User not authenticated (401)');
          clearAuthState();
        } else if (isNetworkError) {
          console.warn('[Auth] Network error during auth check:', axiosError.message || axiosError.code);
          // Don't clear state on network errors - might be temporary
          return null;
        } else {
          console.error('[Auth] Check auth failed:', error);
        }
        
        return null;
      } finally {
        authCheckInProgress = null;
      }
    })();

    return authCheckInProgress;
  },

  /**
   * Initiate OAuth login
   * OAuth endpoints must point to the backend, not the frontend
   */
  login: (provider: 'google' | 'microsoft'): void => {
    const baseUrl = getBackendBaseUrl();
    
    // If no redirect intent has been set yet, default to dashboard
    if (!localStorage.getItem('redirectAfterLogin')) {
      const pendingRedirect = localStorage.getItem('pendingRedirect');
      localStorage.setItem('redirectAfterLogin', pendingRedirect || '/dashboard');
    }

    // Redirect to OAuth provider
    window.location.href = `${baseUrl}/oauth2/authorization/${provider}`;
  },

  /**
   * Handle OAuth callback
   * Validates and stores the token from URL
   */
  handleOAuthCallback: async (): Promise<boolean> => {
    try {
      // Get token from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      // Validate token format
      if (!token || !token.includes('.')) {
        console.error('Invalid token format');
        // Clear any invalid tokens and redirect to login
        clearAuthState();
        window.location.href = '/login';
        return false;
      }
      
      // Store the validated token
      setAuthToken(token);
      
      // Clean up the URL by removing the token
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      return true;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      // On error, clear auth state and redirect to login
      clearAuthState();
      window.location.href = '/login';
      return false;
    }
  },

  /**
   * Logout user
   * Clears all auth state including localStorage
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthState();
      // Redirect to home page after logout
      window.location.href = '/';
    }
  },
  
  /**
   * Get current auth token
   */
  getToken: (): string | null => {
    return getToken();
  },
  
  /**
   * Check if user is authenticated
   * This is a quick check based on localStorage
   * Use checkAuth() for a full server-side check
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('isAuthenticated');
  }
};
