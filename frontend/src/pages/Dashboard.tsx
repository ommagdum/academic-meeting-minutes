import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { searchService } from "@/services/searchService";
import { MeetingSearchResult } from "@/services/searchService";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentMeetingsList } from "@/components/dashboard/RecentMeetingsList";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  // Helper function to calculate percentage change
  const getChangePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };
  const [meetings, setMeetings] = useState<MeetingSearchResult[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{
    totalMeetings: number;
    processedMeetings: number;
    draftMeetings: number;
    processingMeetings: number;
    processingSuccessRate: number;
    upcomingMeetings: number;
    monthlyTrend: Record<string, number>;
  }>({
    totalMeetings: 0,
    processedMeetings: 0,
    draftMeetings: 0,
    processingMeetings: 0,
    processingSuccessRate: 0,
    upcomingMeetings: 0,
    monthlyTrend: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[Dashboard] Loading dashboard data...');
      
      // Helper function to handle API errors
      const handleApiError = (err: unknown, defaultMessage: string) => {
        console.error(defaultMessage, err);
        let errorMessage = defaultMessage;
        
        // Safely extract error message from different error types
        if (err && typeof err === 'object') {
          const errorObj = err as { response?: { data?: { message?: string } } };
          if (errorObj.response?.data?.message) {
            errorMessage = errorObj.response.data.message;
          } else if ('message' in err) {
            errorMessage = String((err as { message: unknown }).message);
          }
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return null;
      };
      
      // Fetch dashboard stats with error handling for each request
      // These are the 3 backend APIs being called:
      // 1. GET /api/v1/dashboard/stats - Dashboard statistics
      // 2. GET /api/v1/search/meetings/category/recent?page=0&size=5 - Recent meetings
      // 3. GET /api/v1/dashboard/upcoming-meetings?size=5 - Upcoming meetings
      
      console.log('[Dashboard] Fetching 3 APIs:');
      console.log('  1. GET /api/v1/dashboard/stats');
      console.log('  2. GET /api/v1/search/meetings/category/recent?page=0&size=5');
      console.log('  3. GET /api/v1/dashboard/upcoming-meetings?size=5');
      
      // Add timeout wrapper to prevent infinite loading
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
          })
        ]).catch(err => {
          console.warn('[Dashboard] Request timeout, using fallback:', err);
          return fallback;
        });
      };
      
      const [statsResponse, recentMeetingsResponse, upcomingMeetingsResponse] = await Promise.all([
        withTimeout(
          searchService.getDashboardStats()
            .then(response => {
              console.log('[Dashboard] Stats loaded successfully:', response);
              return response;
            })
            .catch(err => {
              if (err.response?.status === 400) {
                // Handle 400 Bad Request specifically
                console.warn('[Dashboard] Stats not available (400):', err.response?.data);
                return {
                  totalMeetings: 0,
                  processedMeetings: 0,
                  draftMeetings: 0,
                  processingMeetings: 0,
                  processingSuccessRate: 0,
                  upcomingMeetings: 0,
                  monthlyTrend: {}
                };
              }
              console.error('[Dashboard] Stats error:', err);
              throw err;
            }),
          15000, // 15 second timeout
          {
            totalMeetings: 0,
            processedMeetings: 0,
            draftMeetings: 0,
            processingMeetings: 0,
            processingSuccessRate: 0,
            upcomingMeetings: 0,
            monthlyTrend: {}
          }
        ),
          
        withTimeout(
          searchService.searchByCategory('recent', 0, 5)
            .then(response => {
              console.log('[Dashboard] Raw recent meetings API response:', JSON.stringify(response, null, 2));
              console.log('[Dashboard] First meeting in response:', response.results?.[0] ? {
                id: response.results[0].id,
                _id: (response.results[0] as any)._id,
                title: response.results[0].title
              } : 'No meetings found');
              return response;
            })
            .catch(err => {
              console.error('[Dashboard] Error fetching recent meetings:', err);
              return { results: [], totalResults: 0, totalPages: 0, currentPage: 0 };
            }),
          15000, // 15 second timeout
          { results: [], totalResults: 0, totalPages: 0, currentPage: 0 }
        ),
          
        withTimeout(
          searchService.getUpcomingMeetings(5)
            .then(response => {
              console.log('[Dashboard] Upcoming meetings loaded successfully:', response);
              return response;
            })
            .catch(err => {
              console.warn('[Dashboard] Upcoming meetings not available, using empty array:', err);
              return [];
            }),
          15000, // 15 second timeout
          []
        )
      ]);
      
      console.log('[Dashboard] All API calls completed');

      // Update dashboard stats with fallback values if needed
      const stats = statsResponse || {
        totalMeetings: 0,
        processedMeetings: 0,
        draftMeetings: 0,
        processingMeetings: 0,
        processingSuccessRate: 0,
        upcomingMeetings: 0,
        monthlyTrend: {}
      };
      
      setDashboardStats({
        ...statsResponse,
        upcomingMeetings: upcomingMeetingsResponse?.length || 0
      });

      // Define interface for the raw meeting data from API
      interface RawMeeting extends Omit<MeetingSearchResult, 'id'> {
        _id?: string;
      }
      
      // Set recent meetings - map to the expected Meeting type
      const mappedMeetings = (recentMeetingsResponse?.results || []).map((meeting, index) => {
        // Use meetingId from the API response
        const meetingId = meeting.meetingId || '';
        console.log(`[Dashboard] Mapping meeting ${index + 1}:`, {
          originalId: meeting.id,
          meetingId: meeting.meetingId,
          _id: meeting._id,
          finalId: meetingId,
          title: meeting.title
        });

        return {
          ...meeting,
          id: meetingId, // Make sure we're setting the id field
          updatedAt: meeting.updatedAt || meeting.scheduledTime || meeting.createdAt,
          createdBy: {
            id: meeting.createdBy?.id || '',
            email: meeting.createdBy?.email || '',
            name: meeting.createdBy?.name || 'System',
            role: meeting.createdBy?.role || 'PARTICIPANT',
            createdAt: meeting.createdBy?.createdAt || new Date().toISOString(),
          },
          title: meeting.title || 'Untitled Meeting',
          status: meeting.status || 'DRAFT',
        };
      });

      console.log('[Dashboard] Mapped meetings:', mappedMeetings);
      
      console.log('[Dashboard] Mapped meetings:', mappedMeetings);
      setMeetings(mappedMeetings);
      
      // Update upcoming meetings if we got a valid response
      if (upcomingMeetingsResponse) {
        setUpcomingMeetings(upcomingMeetingsResponse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.error('Error loading dashboard data:', err);
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={loadDashboard}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome back, {user?.name?.split(' ')[0] || 'User'}!
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Here's an overview of your meetings and activities
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="text-sm shrink-0 w-full sm:w-auto"
              onClick={logout}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Mobile Layout: Quick Actions first, then Stats, then Meetings */}
        <div className="block lg:hidden space-y-6">
          {/* Quick Actions - Mobile: First */}
          <QuickActions />

          {/* Stats Cards - Mobile: Second */}
          <div className="grid grid-cols-2 gap-4">
            <StatsCard
              title="Total Meetings"
              value={isLoading ? 0 : dashboardStats.totalMeetings}
              description="All time meetings"
              icon={FileText}
            />
            <StatsCard
              title="Processing"
              value={isLoading ? 0 : dashboardStats.processingMeetings}
              description="Currently being processed"
              icon={Clock}
            />
            <StatsCard
              title="Completed"
              value={isLoading ? 0 : dashboardStats.processedMeetings}
              description="Successfully processed"
              icon={CheckCircle}
            />
            <StatsCard
              title="Upcoming"
              value={isLoading ? 0 : dashboardStats.upcomingMeetings}
              description="Meetings scheduled"
              icon={AlertCircle}
            />
          </div>

          {/* Recent Meetings - Mobile: Third */}
          <RecentMeetingsList meetings={meetings} isLoading={isLoading} />
        </div>

        {/* Desktop Layout: Stats first, then Meetings and Quick Actions side by side */}
        <div className="hidden lg:block space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Meetings"
              value={isLoading ? 0 : dashboardStats.totalMeetings}
              description="All time meetings"
              icon={FileText}
            />
            <StatsCard
              title="Processing"
              value={isLoading ? 0 : dashboardStats.processingMeetings}
              description="Currently being processed"
              icon={Clock}
            />
            <StatsCard
              title="Completed"
              value={isLoading ? 0 : dashboardStats.processedMeetings}
              description="Successfully processed"
              icon={CheckCircle}
            />
            <StatsCard
              title="Upcoming"
              value={isLoading ? 0 : dashboardStats.upcomingMeetings}
              description="Meetings scheduled"
              icon={AlertCircle}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Meetings - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <RecentMeetingsList meetings={meetings} isLoading={isLoading} />
            </div>

            {/* Quick Actions - Takes 1 column */}
            <div>
              <QuickActions />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
