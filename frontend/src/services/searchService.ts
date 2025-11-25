import api from './api';

export interface MeetingSearchResult {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  scheduledTime?: string;
  createdAt: string;
  attendeeCount: number;
  actionItemCount: number;
  seriesId?: string;
  seriesTitle?: string;
  hasTranscript: boolean;
  relevanceScore?: number;
}

export interface AdvancedSearchRequest {
  query?: string;
  fromDate?: string;
  toDate?: string;
  statuses?: string[];
  seriesId?: string;
  hasActionItems?: boolean;
  hasTranscript?: boolean;
  category?: string;
  dateGrouping?: 'day' | 'week' | 'month' | 'year' | 'quarter';
  sortBy?: 'relevance' | 'date' | 'title';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface SearchResponse {
  results: MeetingSearchResult[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
  facets?: Record<string, unknown>;
  dateGroupCounts?: Record<string, number>;
  statusFacet?: Record<string, number>;
  seriesFacet?: Record<string, number>;
}

export interface DashboardStats {
  totalMeetings: number;
  processedMeetings: number;  // Changed from processedCount
  draftMeetings: number;      // Changed from draftCount
  processingMeetings: number; // Changed from processingCount
  processingSuccessRate: number;
  upcomingMeetings: number;   // Changed from upcomingMeetingsCount
  monthlyTrend: Record<string, number>; // Changed from monthlyTrends
}

export interface RecentActivity {
  id: string;
  meetingId: string;
  meetingTitle: string;
  activityType: string;
  timestamp: string;
  description: string;
}

export interface TranscriptSearchResult {
  meetingId: string;
  meetingTitle: string;
  excerpt: string;
  timestamp: string;
  relevanceScore: number;
}

export interface AnalyticsData {
  period: string;
  startDate: string;
  endDate: string;
  dataPoints: Array<{
    date: string;
    meetingCount: number;
    processedCount: number;
    draftCount: number;
  }>;
}

export const searchService = {
  /**
   * Advanced search with multiple filters
   */
  advancedSearch: async (request: AdvancedSearchRequest): Promise<SearchResponse> => {
    const response = await api.post<SearchResponse>('/api/v1/search/meetings', request);
    
    // Handle nested data structure (backend might wrap in 'data' field)
    const responseData = (response.data as any)?.data || response.data;
    
    // Log first result to debug structure
    if (responseData?.results?.[0]) {
      console.log('[searchService] First result structure:', responseData.results[0]);
    }
    
    // Transform response to ensure id field exists (backend might use meetingId)
    if (responseData?.results) {
      responseData.results = responseData.results.map((meeting: any) => {
        const transformed = {
          ...meeting,
          id: meeting.id || meeting.meetingId || meeting._id,
        };
        if (!transformed.id) {
          console.warn('[searchService] Meeting missing ID after transformation:', meeting);
        }
        return transformed;
      });
    }
    
    return responseData;
  },

  /**
   * Quick search (simple query)
   */
  quickSearch: async (query: string, page = 0, size = 10): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>('/api/v1/search/meetings/quick', {
      params: { q: query, page, size }
    });
    return response.data;
  },

  /**
   * Category-based search
   */
  searchByCategory: async (category: string, page = 0, size = 20): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>(`/api/v1/search/meetings/category/${category}`, {
      params: { page, size }
    });
    
    // Handle nested data structure (backend might wrap in 'data' field)
    const responseData = (response.data as any)?.data || response.data;
    
    // Log first result to debug structure
    if (responseData?.results?.[0]) {
      console.log('[searchService] First result structure:', responseData.results[0]);
    }
    
    // Transform response to ensure id field exists (backend might use meetingId)
    if (responseData?.results) {
      responseData.results = responseData.results.map((meeting: any) => {
        const transformed = {
          ...meeting,
          id: meeting.id || meeting.meetingId || meeting._id,
        };
        if (!transformed.id) {
          console.warn('[searchService] Meeting missing ID after transformation:', meeting);
        }
        return transformed;
      });
    }
    
    return responseData;
  },

  /**
   * Search within transcripts
   */
  searchTranscripts: async (query: string, page = 0, size = 10): Promise<{ results: TranscriptSearchResult[]; total: number }> => {
    const response = await api.get<{ results: TranscriptSearchResult[]; total: number }>('/api/v1/search/transcripts', {
      params: { q: query, page, size }
    });
    return response.data;
  },

  /**
   * Get analytics data
   */
  getAnalytics: async (period: string, startDate?: string, endDate?: string): Promise<AnalyticsData> => {
    const response = await api.get<AnalyticsData>('/api/v1/search/analytics/meetings', {
      params: { period, startDate, endDate }
    });
    return response.data;
  },

  /**
   * Get search facets
   */
  getFacets: async (): Promise<{ statuses: string[]; series: Array<{id: string, title: string}> }> => {
    const response = await api.get('/api/v1/search/facets');
    return response.data;
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats(): Promise<DashboardStats> {
    return api.get('/api/v1/dashboard/stats')
      .then(res => {
        // Map backend response to frontend interface
        const data = res.data;
        return {
          totalMeetings: data.totalMeetings || 0,
          processedMeetings: data.processedMeetings || 0,
          draftMeetings: data.draftMeetings || 0,
          processingMeetings: data.processingMeetings || 0,
          processingSuccessRate: data.processingSuccessRate || 0,
          upcomingMeetings: data.upcomingMeetings || 0,
          monthlyTrend: data.monthlyTrend || {}
        };
      });
  },

  /**
   * Get recent activity
   */
  getRecentActivity: async (limit = 5): Promise<RecentActivity[]> => {
    const response = await api.get<RecentActivity[]>('/api/v1/dashboard/recent-activity', {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get upcoming meetings
   */
  getUpcomingMeetings: async (limit = 5): Promise<MeetingSearchResult[]> => {
    // Changed from limit to size to match backend
    return api.get(`/api/v1/dashboard/upcoming-meetings?size=${limit}`)
      .then(res => Array.isArray(res.data) ? res.data : []);
  },

  /**
   * Get processing queue
   */
  getProcessingQueue: async (): Promise<MeetingSearchResult[]> => {
    const response = await api.get<MeetingSearchResult[]>('/api/v1/dashboard/processing-queue');
    return response.data;
  }
};

export default searchService;
