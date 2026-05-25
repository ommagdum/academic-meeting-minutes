import { User } from './user';

export type AuthProvider = 'google' | 'local' | null;

export type AuthState = {
  token: string | null;
  user: User | null;
  provider: AuthProvider;
};

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  provider: AuthProvider;
  login: (provider: 'google') => void;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: (force?: boolean) => Promise<User | null>;
};

export interface AuthProviderProps {
  children: React.ReactNode;
}
