import { User } from './user';

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: 'google') => void;
  logout: () => Promise<void>;
  checkAuth: (force?: boolean) => Promise<User | null>;
};

export interface AuthProviderProps {
  children: React.ReactNode;
}
