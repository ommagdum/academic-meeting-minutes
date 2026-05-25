import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { searchService } from "@/services/searchService";
import { MeetingSearchResult } from "@/services/searchService";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentMeetingsList } from "@/components/dashboard/RecentMeetingsList";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { FileText, Clock, CheckCircle, AlertCircle, LogOut, ChevronDown, RefreshCw, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      console.log('[Dashboard] User object:', user);
    }
  }, [user]);
  
  const getUserInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
          searchService.getDashboardStats().catch(err => {
            if (err.response?.status === 400) {
              return { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, upcomingMeetings: 0, monthlyTrend: {} };
            }
            throw err;
          }),
          15000,
          { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, upcomingMeetings: 0, monthlyTrend: {} }
        ),
        withTimeout(
          searchService.searchByCategory('recent', 0, 5).catch(() => ({ results: [], totalResults: 0, totalPages: 0, currentPage: 0 })),
          15000,
          { results: [], totalResults: 0, totalPages: 0, currentPage: 0 }
        ),
        withTimeout(
          searchService.getUpcomingMeetings(5).catch(() => []),
          15000,
          []
        )
      ]);
      
      const stats = statsResponse || { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, upcomingMeetings: 0, monthlyTrend: {} };
      
      setDashboardStats({
        ...stats,
        upcomingMeetings: upcomingMeetingsResponse?.length || 0
      });

      const mappedMeetings = (recentMeetingsResponse?.results || []).map((meeting) => {
        const meetingId = meeting.meetingId || '';
        return {
          ...meeting,
          id: meetingId,
          updatedAt: meeting.updatedAt || meeting.scheduledTime || meeting.createdAt,
          createdBy: {
            id: meeting.createdBy?.id || '',
            email: meeting.createdBy?.email || '',
            name: meeting.createdBy?.name || 'System',
            role: meeting.createdBy?.role || 'PARTICIPANT',
            createdAt: meeting.createdBy?.createdAt || new Date().toISOString(),
          },
          title: meeting.title || 'Untitled Meeting',
          status: meeting.status,
        };
      });
      
      setMeetings(mappedMeetings);
      if (upcomingMeetingsResponse) {
        setUpcomingMeetings(upcomingMeetingsResponse);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(), 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-lg border p-5 flex items-start gap-4" style={{ background: "rgba(255,69,58,0.05)", borderColor: "rgba(255,69,58,0.2)", color: "#FF453A" }}>
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium mb-1">Error loading dashboard</h3>
            <p className="text-sm opacity-90 mb-4">{error}</p>
            <button
              onClick={loadDashboard}
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{ background: "rgba(255,69,58,0.15)", color: "#FF453A" }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
        <div>
          <h1 className="display-sm mb-1.5" style={{ color: "var(--text-primary)" }}>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="body-base">Here's an overview of your meetings and activities</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboard()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover-scale"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: "var(--text-secondary)" }} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
                  style={{ background: "rgba(0,113,227,0.15)", color: "#0071E3" }}
                >
                  {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getUserInitials(user?.name)
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {user?.name || 'User'}
                </span>
                <ChevronDown className="w-4 h-4 hidden sm:block" style={{ color: "var(--text-tertiary)" }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                  <p className="text-xs leading-none" style={{ color: "var(--text-secondary)" }}>{user?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ background: "var(--border-subtle)" }} />
              <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5" onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-500 focus:text-red-500 hover:bg-red-500/10 focus:bg-red-500/10" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Mobile Layout ─────────────────────────────────────── */}
      <div className="block lg:hidden space-y-6">
        <QuickActions />
        <div className="grid grid-cols-2 gap-4">
          <StatsCard title="Total Meetings" value={isLoading ? 0 : dashboardStats.totalMeetings} description="All time meetings" icon={FileText} />
          <StatsCard title="Processing" value={isLoading ? 0 : dashboardStats.processingMeetings} description="Currently being processed" icon={Clock} />
          <StatsCard title="Completed" value={isLoading ? 0 : dashboardStats.processedMeetings} description="Successfully processed" icon={CheckCircle} />
          <StatsCard title="Upcoming" value={isLoading ? 0 : dashboardStats.upcomingMeetings} description="Meetings scheduled" icon={AlertCircle} />
        </div>
        <RecentMeetingsList meetings={meetings} isLoading={isLoading} />
      </div>

      {/* ── Desktop Layout ────────────────────────────────────── */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-4 gap-6">
          <StatsCard title="Total Meetings" value={isLoading ? 0 : dashboardStats.totalMeetings} description="All time meetings" icon={FileText} />
          <StatsCard title="Processing" value={isLoading ? 0 : dashboardStats.processingMeetings} description="Currently being processed" icon={Clock} />
          <StatsCard title="Completed" value={isLoading ? 0 : dashboardStats.processedMeetings} description="Successfully processed" icon={CheckCircle} />
          <StatsCard title="Upcoming" value={isLoading ? 0 : dashboardStats.upcomingMeetings} description="Meetings scheduled" icon={AlertCircle} />
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <RecentMeetingsList meetings={meetings} isLoading={isLoading} />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
