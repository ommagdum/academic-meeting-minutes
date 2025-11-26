import api from './api';
import { Meeting, CreateMeetingRequest, MeetingSeries, ProcessingStatus, UploadResponse, ActionItem, AttendeesResponse } from '@/types/meeting';
import { Transcript, ApiResponse } from '@/types/transcript';
import { AxiosError } from 'axios';

export const meetingService = {
  /**
   * Create a new meeting
   */
  createMeeting: async (data: CreateMeetingRequest): Promise<Meeting> => {
    const response = await api.post<Meeting>('/api/v1/meetings', data);
    return response.data;
  },

  /**
   * Upload audio file for a meeting
   */
  uploadAudio: async (meetingId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>(
      `/api/v1/meetings/${meetingId}/upload-audio`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Invite participants to a meeting
   */
  inviteParticipants: async (meetingId: string, emails: string[]): Promise<void> => {
    await api.post(`/api/v1/meetings/${meetingId}/invite`, { emails });
  },

  /**
   * Start AI processing for a meeting
   */
  startProcessing: async (meetingId: string): Promise<void> => {
    await api.post(`/api/v1/meetings/${meetingId}/process`);
  },

  /**
   * Get processing status
   */
  getProcessingStatus: async (meetingId: string): Promise<ProcessingStatus> => {
    const response = await api.get<ProcessingStatus>(
      `/api/v1/meetings/${meetingId}/processing-status`
    );
    return response.data;
  },

  /**
   * Get meeting by ID
   */
  getMeeting: async (meetingId: string): Promise<Meeting> => {
    console.log(`[meetingService] getMeeting called for ID: ${meetingId}`);
    
    if (!meetingId) {
      const error = new Error('No meeting ID provided');
      console.error('[meetingService] Error:', error);
      throw error;
    }

    try {
      console.log(`[meetingService] Sending request to /api/v1/meetings/${meetingId}`);
      const response = await api.get<Meeting>(`/api/v1/meetings/${meetingId}`, {
        params: { _: new Date().getTime() }, // Prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('[meetingService] Received response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data ? 'data received' : 'no data'
      });
      
      if (!response.data) {
        const error = new Error('No data received from server');
        console.error('[meetingService] Error:', error);
        throw error;
      }
      
      console.log('[meetingService] Meeting data:', response.data);
      return response.data;
      
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const status = axiosError.response?.status;
      const errorData = axiosError.response?.data;
      
      console.error('[meetingService] Error fetching meeting:', {
        status,
        statusText: axiosError.response?.statusText,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseData: errorData
      });
      
      if (status === 404) {
        throw new Error('Meeting not found');
      } else if (status === 403) {
        throw new Error('You do not have permission to view this meeting');
      } else if (status === 401) {
        throw new Error('Authentication required');
      } else {
        const errorMessage = errorData?.message || axiosError.message || 'Failed to fetch meeting';
        throw new Error(errorMessage);
      }
    }
  },

  /**
   * Get all meetings
   */
  getMeetings: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<{ data: Meeting[] }> => {
    const response = await api.get<{ data: Meeting[] }>('/api/v1/meetings', { params });
    return response.data;
  },

  /**
   * Get all meeting series
   */
  getMeetingSeries: async (): Promise<MeetingSeries[]> => {
    const response = await api.get<MeetingSeries[]>('/api/v1/meeting-series');
    return response.data;
  },

  /**
   * Update meeting
   */
  updateMeeting: async (meetingId: string, data: Partial<CreateMeetingRequest>): Promise<Meeting> => {
    const response = await api.patch<Meeting>(`/api/v1/meetings/${meetingId}`, data);
    return response.data;
  },

  /**
   * Delete meeting
   */
  deleteMeeting: async (meetingId: string): Promise<void> => {
    await api.delete(`/api/v1/meetings/${meetingId}`);
  },

  /**
   * Get action items for a meeting
   */
  getActionItems: async (meetingId: string): Promise<ActionItem[]> => {
    const response = await api.get<ActionItem[]>(`/api/v1/meetings/${meetingId}/action-items`);
    return response.data;
  },

  /**
   * Download a document (e.g., minutes PDF) for a meeting
   */
  downloadDocument: async (meetingId: string, documentId: string, filename = 'minutes.pdf'): Promise<void> => {
    const url = `/api/v1/meetings/${meetingId}/documents/${documentId}/download`;
    const response = await api.get(url, { responseType: 'blob' });

    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  /**
   * Get transcript for a meeting
   */
  getMeetingTranscript: async (meetingId: string): Promise<Transcript> => {
    try {
      const response = await api.get<ApiResponse<Transcript>>(`/api/v1/meetings/${meetingId}/transcript`);
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch transcript');
      }
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching transcript:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        error: axiosError.message,
        responseData: axiosError.response?.data
      });
      throw error;
    }
  },

  getMeetingAttendees: async (
    meetingId: string,
    params?: {
      page?: number;
      size?: number;
      status?: string;
    }
  ): Promise<AttendeesResponse> => {
    try {
      const response = await api.get<ApiResponse<AttendeesResponse>>(
        `/api/v1/meetings/${meetingId}/attendees`,
        { params }
      );
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to fetch attendees');
      }
      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      console.error('Error fetching attendees:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        error: axiosError.message,
        responseData: axiosError.response?.data
      });
      throw error;
    }
  }
};
