# Authentication, API, and OAuth Issues Analysis

## Critical Issues

### 1. **OAuth Base URL Configuration Error** ⚠️ CRITICAL
**Location:** `src/services/authService.ts:81-85`

**Problem:**
- The `getBaseUrl()` function returns `window.location.origin` (frontend URL) when `VITE_API_BASE_URL` is not set
- OAuth authorization endpoints should point to the **backend**, not the frontend
- This causes OAuth redirects to fail because the frontend doesn't have OAuth endpoints

**Current Code:**
```typescript
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  return window.location.origin; // ❌ WRONG - This is the frontend URL
};
```

**Fix Required:**
- Always use the backend API URL for OAuth endpoints
- Should default to `http://localhost:8080` (backend) instead of frontend origin

---

### 2. **Token Storage Inconsistency** ⚠️ CRITICAL
**Location:** Multiple files

**Problem:**
- Mixed usage of localStorage and cookies for token storage
- `authService.ts` checks `localStorage.getItem('auth_token') === 'active'` (just a flag)
- `OAuthRedirect.tsx` sets `localStorage.setItem('auth_token', token)` (actual token)
- `OAuthRedirect.tsx` also sets `localStorage.setItem('auth_token', 'active')` (flag)
- `api.ts` tries to read token from cookies: `document.cookie.split('auth_token=')`
- This creates confusion about where the actual token is stored

**Issues:**
- Token might be in localStorage but code looks in cookies
- Token might be in cookies but code checks localStorage flag
- No single source of truth for authentication state

---

### 3. **Cookie Setting Format Error** ⚠️ HIGH
**Location:** `src/pages/OAuthRedirect.tsx:29-36` and `src/services/api.ts:68-70`

**Problem:**
- Cookie format is incorrect - missing proper attribute syntax
- Line 33: `window.location.hostname === 'localhost' ? '' : 'secure'` - should be `'secure'` not just `secure`
- Missing proper cookie expiration
- `samesite=strict` should be `SameSite=Strict` (capitalized)

**Current Code:**
```typescript
const cookieOptions = [
  `auth_token=${token}`,
  'path=/',
  'samesite=strict',  // ❌ Should be 'SameSite=Strict'
  window.location.hostname === 'localhost' ? '' : 'secure'  // ❌ Should be '; secure'
].filter(Boolean).join('; ');
```

---

### 4. **OAuth Redirect Route Mismatch** ⚠️ HIGH
**Location:** `src/services/authService.ts:83-84` vs `src/App.tsx:28`

**Problem:**
- Frontend route is `/oauth2/redirect`
- Backend likely redirects to this route after OAuth
- But the OAuth initiation URLs point to backend endpoints
- Need to verify backend redirect URL matches frontend route

**Frontend Route:**
```typescript
<Route path="/oauth2/redirect" element={<OAuthRedirect />} />
```

**OAuth URLs:**
```typescript
google: `${baseUrl}/oauth2/authorization/google`,
microsoft: `${baseUrl}/oauth2/authorization/azure`,
```

---

### 5. **Token Refresh Logic Issues** ⚠️ HIGH
**Location:** `src/services/api.ts:54-79`

**Problems:**
- Assumes `response.data.token` exists, but backend might return different structure
- Cookie setting format is incorrect (same issue as #3)
- No error handling if token refresh fails but user is still authenticated via session cookie
- Redirects to `/auth` on refresh failure, but user might still have valid session

**Current Code:**
```typescript
if (response.data.token) {  // ❌ Assumes this structure
  document.cookie = `auth_token=${response.data.token}; path=/; samesite=strict${
    window.location.hostname === 'localhost' ? '' : '; secure'
  }`;  // ❌ Incorrect format
}
```

---

### 6. **Race Condition in Auth Checks** ⚠️ MEDIUM
**Location:** `src/contexts/AuthContext.tsx` and `src/pages/OAuthRedirect.tsx`

**Problem:**
- Both `AuthContext` and `OAuthRedirect` call `checkAuth()` simultaneously
- `authService.checkAuth()` has a guard, but both components might trigger before guard is set
- Could cause multiple concurrent API calls to `/api/auth/me`

**Location:**
- `AuthContext.tsx:90-178` - useEffect runs on location change
- `OAuthRedirect.tsx:47` - calls `checkAuth(true)` immediately

---

### 7. **Missing Error Handling for Cookie Reading** ⚠️ MEDIUM
**Location:** `src/services/api.ts:19-22` and `src/services/authService.ts:30-33`

**Problem:**
- Cookie parsing doesn't handle edge cases:
  - Empty cookies
  - Malformed cookies
  - Multiple cookies with same name
- No validation that token exists before using it

**Current Code:**
```typescript
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('auth_token='))
  ?.split('=')[1];  // ❌ Could be undefined, but used without check
```

---

### 8. **Inconsistent Auth State Management** ⚠️ MEDIUM
**Location:** `src/contexts/AuthContext.tsx:95-103`

**Problem:**
- Handles token from URL params separately from cookie-based auth
- Sets token in localStorage but doesn't set cookie
- Creates two different auth flows that might conflict

**Code:**
```typescript
if (token) {
  localStorage.setItem('auth_token', token);  // ❌ Sets actual token
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  navigate(returnTo, { replace: true });
  return;
}
```

But `authService.checkAuth()` expects token in cookies, not localStorage.

---

### 9. **Missing Dependency in useEffect** ⚠️ LOW
**Location:** `src/pages/OAuthRedirect.tsx:65`

**Problem:**
- `checkAuth` is in dependencies but it's a function from context
- Function reference might change, causing unnecessary re-runs
- Should use `useCallback` in context or remove from deps

---

### 10. **Logout Doesn't Clear All Auth State** ⚠️ MEDIUM
**Location:** `src/services/authService.ts:107-115` and `src/contexts/AuthContext.tsx:184-197`

**Problem:**
- `authService.logout()` only calls API, doesn't clear localStorage/cookies
- `AuthContext.logout()` clears user state but relies on service
- If API call fails, auth state might remain

**Current Code:**
```typescript
logout: async (): Promise<void> => {
  try {
    await api.post('/api/auth/logout');
    // ❌ Doesn't clear localStorage or cookies
  } catch (error) {
    console.error('[Auth] Logout failed:', error);
    throw error;
  }
},
```

---

## Summary of Required Fixes

### Priority 1 (Critical - Breaks OAuth):
1. Fix OAuth base URL to use backend URL
2. Standardize token storage (choose cookies OR localStorage, not both)
3. Fix cookie format and attributes

### Priority 2 (High - Causes Auth Failures):
4. Fix token refresh logic and error handling
5. Verify OAuth redirect route matches backend
6. Fix cookie reading with proper error handling

### Priority 3 (Medium - Quality/Reliability):
7. Fix race conditions in auth checks
8. Standardize auth state management
9. Improve logout to clear all state
10. Fix useEffect dependencies

---

## Recommended Architecture

1. **Use HTTP-only cookies** (set by backend) for tokens - more secure
2. **Use localStorage** only for auth state flag (e.g., `isAuthenticated: true`)
3. **Backend should handle** all token management via cookies
4. **Frontend should** only check `/api/auth/me` to verify session
5. **OAuth flow:**
   - Frontend redirects to: `{BACKEND_URL}/oauth2/authorization/{provider}`
   - Backend redirects to: `{FRONTEND_URL}/oauth2/redirect?token=...` (if needed)
   - Or better: Backend sets HTTP-only cookie and redirects to frontend
   - Frontend calls `/api/auth/me` to get user data

