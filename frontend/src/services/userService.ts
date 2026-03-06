import api from './api';
import { User } from '../types/user';

export interface ProfileUpdateRequest {
  name: string;
  profilePictureUrl?: string;
}

export const userService = {
  /**
   * Get current user profile
   */
  getCurrentProfile: async (): Promise<User> => {
    const response = await api.get<User>('/api/v1/users/profile');
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (profileData: ProfileUpdateRequest): Promise<User> => {
    const response = await api.put<User>('/api/v1/users/profile', profileData);
    return response.data;
  },

  /**
   * Get user profile by ID
   */
  getUserProfile: async (userId: string): Promise<User> => {
    const response = await api.get<User>(`/api/v1/users/${userId}/profile`);
    return response.data;
  },

  /**
   * Check if user exists by email
   */
  checkUserExists: async (email: string): Promise<boolean> => {
    const response = await api.get<boolean>('/api/v1/users/profile/exists', {
      params: { email }
    });
    return response.data;
  }
};
