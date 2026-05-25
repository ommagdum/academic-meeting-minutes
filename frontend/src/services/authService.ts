import api from './api';
import { User, AuthResponse } from '../types/user';
import { AuthProvider } from '../types/auth';

const TOKEN_KEY = 'auth_token';
const PROVIDER_KEY = 'auth_provider';

// ─── Token helpers ─────────────────────────────────────────────────────────────
// Per backend docs: prefer sessionStorage over localStorage for JWTs.
// We keep localStorage as fallback so existing Google-auth sessions survive a
// hard reload — feel free to change both to sessionStorage if stricter security
// is desired.

export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const getProvider = (): AuthProvider => {
  try {
    const p = sessionStorage.getItem(PROVIDER_KEY) ?? localStorage.getItem(PROVIDER_KEY);
    return (p as AuthProvider) ?? null;
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null, provider: AuthProvider = null): void => {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem('isAuthenticated', 'true');
    if (provider) sessionStorage.setItem(PROVIDER_KEY, provider);
    // Mirror to localStorage so Google-OAuth redirect survives the page reload
    if (provider === 'google') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem(PROVIDER_KEY, provider);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    clearAuthState();
  }
};

export const clearAuthState = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('isAuthenticated');
  sessionStorage.removeItem(PROVIDER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem(PROVIDER_KEY);
  delete api.defaults.headers.common['Authorization'];
};

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const initializeAuth = () => {
  const token = getToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};
initializeAuth();

// ─── Backend URL ────────────────────────────────────────────────────────────────
const getBackendBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ─── Shared user mapper ─────────────────────────────────────────────────────────
const mapUser = (userData: any): User => ({
  id: userData.id || userData.userId || '',
  email: userData.email || '',
  name: userData.name || userData.displayName || 'User',
  profilePictureUrl: userData.profilePictureUrl ?? userData.profilePicture ?? userData.picture ?? null,
  role: userData.role || 'PARTICIPANT',
  lastLogin: userData.lastLogin || userData.lastLoginAt || new Date().toISOString(),
  emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : false,
  createdAt: userData.createdAt || new Date().toISOString(),
});

// ─── In-flight dedup guard ──────────────────────────────────────────────────────
let authCheckInProgress: Promise<User | null> | null = null;

// ─── Auth service ───────────────────────────────────────────────────────────────
export const authService = {
  /**
   * Register a new user with email + password.
   * POST /api/auth/register  →  201 Created
   * Returns the registered email (no JWT — user must verify email first).
   */
  register: async (name: string, email: string, password: string): Promise<{ email: string; message: string }> => {
    const response = await api.post<AuthResponse>('/api/auth/register', { name, email, password });
    // No token is returned — user needs to verify email before they can log in
    return {
      email,
      message: (response.data as any).message || 'VERIFICATION_EMAIL_SENT',
    };
  },

  /**
   * Login an existing credential-based user.
   * POST /api/auth/login  →  200 OK  →  AuthResponse
   */
  loginWithCredentials: async (email: string, password: string): Promise<User> => {
    const response = await api.post<AuthResponse>('/api/auth/login', { email, password });
    const { accessToken, user } = response.data;
    setAuthToken(accessToken, 'local');
    return mapUser(user);
  },

  /**
   * Initiate Google OAuth2 login (redirect).
   */
  login: (provider: 'google'): void => {
    const baseUrl = getBackendBaseUrl();
    if (!localStorage.getItem('redirectAfterLogin')) {
      const pendingRedirect = localStorage.getItem('pendingRedirect');
      localStorage.setItem('redirectAfterLogin', pendingRedirect || '/dashboard');
    }
    window.location.href = `${baseUrl}/oauth2/authorization/${provider}`;
  },

  /**
   * Handle OAuth2 callback — validates and stores the token from the URL.
   */
  handleOAuthCallback: async (): Promise<boolean> => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (!token || !token.includes('.')) {
        console.error('Invalid token format');
        clearAuthState();
        window.location.href = '/login';
        return false;
      }
      setAuthToken(token, 'google');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return true;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      clearAuthState();
      window.location.href = '/login';
      return false;
    }
  },

  /**
   * Check current authentication status via GET /api/auth/me.
   */
  checkAuth: async (force = false): Promise<User | null> => {
    if (authCheckInProgress && !force) {
      return authCheckInProgress;
    }

    const token = getToken();
    if (!token) {
      clearAuthState();
      return null;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    authCheckInProgress = (async (): Promise<User | null> => {
      try {
        const response = await api.get<any>('/api/auth/me', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          params: { _: new Date().getTime() },
          timeout: 10000,
        });

        console.log('[Auth] Raw API response:', response.data);
        const userData = (response.data as any)?.data || response.data;
        console.log('[Auth] User data:', userData);

        if (userData) {
          const user = mapUser(userData);
          console.log('[Auth] Mapped user object:', user);
          return user;
        }
        throw new Error('No user data received');
      } catch (error) {
        const axiosError = error as { response?: { status: number }; code?: string; message: string };
        const isUnauthorized = axiosError.response?.status === 401;
        const isNetworkError =
          !axiosError.response ||
          axiosError.code === 'ECONNABORTED' ||
          axiosError.code === 'ERR_NETWORK';

        if (isUnauthorized) {
          console.log('[Auth] User not authenticated (401)');
          clearAuthState();
        } else if (isNetworkError) {
          console.warn('[Auth] Network error during auth check:', axiosError.message || axiosError.code);
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
   * Logout — calls POST /api/auth/logout then clears local state.
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearAuthState();
      window.location.href = '/';
    }
  },

  /**
   * Verify email address using the token from the verification link.
   * GET /api/auth/verify-email?token={token}
   */
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.get('/api/auth/verify-email', {
      params: { token },
    });
    return { success: true, message: (response.data as any).message || 'Email verified successfully' };
  },

  /**
   * Request a new verification email.
   * POST /api/auth/resend-verification
   */
  resendVerification: async (email: string): Promise<void> => {
    await api.post('/api/auth/resend-verification', { email });
  },

  /**
   * Request a password reset link.
   * POST /api/auth/forgot-password
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return { message: (response.data as any).message };
  },

  /**
   * Reset the password using the token.
   * POST /api/auth/reset-password
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/reset-password', { token, newPassword });
    return { message: (response.data as any).message };
  },

  getToken: (): string | null => getToken(),
  getProvider: (): AuthProvider => getProvider(),
  isAuthenticated: (): boolean =>
    !!(sessionStorage.getItem('isAuthenticated') || localStorage.getItem('isAuthenticated')),
};
