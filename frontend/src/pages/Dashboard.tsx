import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { searchService, MeetingSearchResult } from "@/services/searchService";
import { taskService, ActionItemResponse } from "@/services/taskService";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentMeetingsList } from "@/components/dashboard/RecentMeetingsList";
import { QuickActions } from "@/components/dashboard/QuickActions";
import DashboardAreaChart from "@/components/dashboard/DashboardAreaChart";
import TaskStatusDonut from "@/components/dashboard/TaskStatusDonut";
import { UrgentTasksWidget } from "@/components/dashboard/UrgentTasksWidget";
import { FileText, Clock, CheckCircle, AlertCircle, LogOut, ChevronDown, RefreshCw, User, TrendingUp, CheckSquare } from "lucide-react";
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
  
  const getUserInitials = (name: string | undefined): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const [meetings, setMeetings] = useState<MeetingSearchResult[]>([]);
  const [tasks, setTasks] = useState<ActionItemResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{
    totalMeetings: number;
    processedMeetings: number;
    draftMeetings: number;
    processingMeetings: number;
    processingSuccessRate: number;
    monthlyTrend: Record<string, number>;
  }>({
    totalMeetings: 0,
    processedMeetings: 0,
    draftMeetings: 0,
    processingMeetings: 0,
    processingSuccessRate: 0,
    monthlyTrend: {},
  });
  
  const [taskStats, setTaskStats] = useState({ completed: 0, pending: 0, overdue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<Record<string, number>>({});

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
      
      const [statsResponse, recentMeetingsResponse, analyticsResponse, tasksResponse] = await Promise.all([
        withTimeout(
          searchService.getDashboardStats().catch(err => {
            if (err.response?.status === 400) {
              return { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, monthlyTrend: {} };
            }
            throw err;
          }),
          15000,
          { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, monthlyTrend: {} }
        ),
        withTimeout(
          searchService.searchByCategory('recent', 0, 5).catch(() => ({ results: [], totalResults: 0, totalPages: 0, currentPage: 0 })),
          15000,
          { results: [], totalResults: 0, totalPages: 0, currentPage: 0 }
        ),
        withTimeout(
          searchService.getAnalytics(
            'day',
            (() => {
              const d = new Date();
              d.setDate(d.getDate() - 27);
              d.setHours(0, 0, 0, 0);
              return d.toISOString().slice(0, 19);
            })(),
            (() => {
              const d = new Date();
              d.setHours(23, 59, 59, 0);
              return d.toISOString().slice(0, 19);
            })()
          ).catch(() => ({})),
          15000,
          {}
        ),
        withTimeout(
          taskService.getMyTasks().catch(() => []),
          15000,
          []
        )
      ]);
      
      const stats = statsResponse || { totalMeetings: 0, processedMeetings: 0, draftMeetings: 0, processingMeetings: 0, processingSuccessRate: 0, monthlyTrend: {} };
      
      setDashboardStats(stats);
      setTasks(tasksResponse || []);
      
      // Calculate task stats
      const taskCounts = (tasksResponse || []).reduce((acc, task) => {
        if (task.status === 'COMPLETED') acc.completed++;
        else if (task.status === 'OVERDUE') acc.overdue++;
        else if (task.status !== 'CANCELLED') acc.pending++;
        return acc;
      }, { completed: 0, pending: 0, overdue: 0 });
      setTaskStats(taskCounts);

      const mappedMeetings = (recentMeetingsResponse?.results || []).map((meeting) => {
        const meetingId = meeting.meetingId || '';
        return {
          ...meeting,
          id: meetingId,
          updatedAt: meeting.updatedAt || meeting.createdAt,
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
      
      // Pad analytics with 0s for the last 28 days so the area chart always draws a full line
      const paddedAnalytics: Record<string, number> = {};
      for (let i = 27; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        paddedAnalytics[d.toISOString().split('T')[0]] = 0;
      }
      
      if (analyticsResponse) {
        Object.entries(analyticsResponse).forEach(([k, v]) => {
          const dateKey = k.split('T')[0];
          if (paddedAnalytics[dateKey] !== undefined) {
            paddedAnalytics[dateKey] += v as number;
          } else {
            paddedAnalytics[dateKey] = v as number;
          }
        });
      }
      setAnalyticsData(paddedAnalytics);
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
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in space-y-8">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
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

      {/* ── Band 1: Top Metrics & Action Items ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatsCard title="Total Meetings" value={isLoading ? 0 : dashboardStats.totalMeetings} description="All time meetings" icon={FileText} />
            <StatsCard title="Processing" value={isLoading ? 0 : dashboardStats.processingMeetings} description="Currently being processed" icon={Clock} />
            <StatsCard title="Completed" value={isLoading ? 0 : dashboardStats.processedMeetings} description="Successfully processed" icon={CheckCircle} />
          </div>
          {/* Main Analytics Banner */}
          <div className="card-surface p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5" style={{ color: "#0071E3" }} />
              <h2 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Meeting Activity</h2>
            </div>
            <DashboardAreaChart data={analyticsData} height={250} />
          </div>
        </div>
        
        {/* Right column: Urgent Tasks */}
        <div className="h-full flex flex-col gap-6">
          <div className="flex-1">
            <UrgentTasksWidget tasks={tasks} />
          </div>
        </div>
      </div>

      {/* ── Band 2: Secondary Analytics & Task Overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-surface p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckSquare className="w-5 h-5" style={{ color: "#34C759" }} />
            <h2 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Task Overview</h2>
          </div>
          <TaskStatusDonut completed={taskStats.completed} pending={taskStats.pending} overdue={taskStats.overdue} height={220} />
        </div>
        
        <div className="lg:col-span-2">
           <RecentMeetingsList meetings={meetings} isLoading={isLoading} />
        </div>
      </div>

      {/* ── Band 3: Quick Actions ────────────────────────────────────────────── */}
      <div>
        <QuickActions />
      </div>

    </div>
  );
};

export default Dashboard;
