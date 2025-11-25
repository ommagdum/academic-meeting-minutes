import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosRequestHeaders } from 'axios';
import { getToken, clearAuthState } from './authService';

// Extend the AxiosRequestConfig to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
  // Remove withCredentials since we're using Bearer token
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
      _retry: config._retry,
      _skipAuthRefresh: config._skipAuthRefresh
    });

    // Skip adding auth header for login/refresh endpoints
    if (config._skipAuthRefresh) {
      return config;
    }

    // Ensure headers object exists with proper type
    const headers = config.headers || ({} as AxiosRequestHeaders);
    
    // Get token from auth service
    const token = getToken();
    
    // Add Authorization header if token exists
    if (token) {
      console.log('[API] Adding Authorization header');
      headers.Authorization = `Bearer ${token}`;
    } else if (headers.Authorization) {
      // If no token but Authorization header exists, remove it
      console.log('[API] No auth token available, removing Authorization header');
      delete headers.Authorization;
    }
    
    // Add cache control headers
    headers['Cache-Control'] = 'no-cache';
    headers['Pragma'] = 'no-cache';
    
    const newConfig = {
      ...config,
      headers
    };
    
    console.log('[API] Request config:', {
      url: newConfig.url,
      method: newConfig.method,
      headers: newConfig.headers,
      _retry: newConfig._retry
    });
    
    return newConfig;
  },
  (error) => {
    console.error('[API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and redirects
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API] Response ${response.status} ${response.config.url}`, {
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    console.error('[API] Response error:', {
      url: config?.url,
      method: config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      _retry: config?._retry,
      _skipAuthRefresh: config?._skipAuthRefresh
    });
    const originalRequest = error.config as CustomAxiosRequestConfig;

    // Skip handling for login/refresh endpoints or if we've already retried
    if (originalRequest._skipAuthRefresh || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;
      
      const requestUrl = originalRequest.url || '';
      // Only clear auth state for authentication-related endpoints
      // Resource endpoints (like /api/v1/meetings) should handle 401 gracefully
      // without clearing auth state, as they might be permission issues (should be 403)
      const isAuthEndpoint = requestUrl.includes('/api/auth/') || 
                             requestUrl.includes('/oauth2/') ||
                             requestUrl === '/api/auth/me';
      
      // Only clear auth state if:
      // 1. We have a token (prevents clearing on first load)
      // 2. It's an auth endpoint (indicates token is truly invalid/expired)
      if (getToken() && isAuthEndpoint) {
        console.log('Authentication expired on auth endpoint, redirecting to login');
        // Clear any existing auth state
        clearAuthState();
        
        // Redirect to login if not already on login page
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/auth')) {
          const redirectPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
        }
      } else if (getToken() && !isAuthEndpoint) {
        // For resource endpoints, log but don't clear auth state
        // Let the component handle the error (might be a permission issue)
        console.warn('[API] 401 received on resource endpoint - may be a permission issue:', requestUrl);
      }
      
      return Promise.reject('Session expired. Please log in again.');
    }
    
    // Handle other errors
    if (error.response) {
      // Server responded with a status code outside 2xx
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response.data
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;