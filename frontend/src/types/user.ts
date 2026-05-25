export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl: string | null;
  role: 'PARTICIPANT' | 'ORGANIZER' | 'ADMIN';
  lastLogin: string;
  emailVerified: boolean;
  createdAt: string;
  token?: string; // JWT token for authenticated requests
}

/** Returned by POST /api/auth/register and POST /api/auth/login */
export interface AuthResponse {
  accessToken: string;
  tokenType: string; // always "Bearer"
  user: User;
}
