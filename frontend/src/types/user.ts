export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl: string;
  role: 'OWNER' | 'PARTICIPANT' | 'VIEWER';
  lastLogin: string;
  emailVerified: boolean;
  token?: string; // JWT token for authenticated requests
}

export interface AuthResponse {
  user: User;
  token: string;
}
