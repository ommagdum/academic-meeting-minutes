import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meetingService } from "@/services/meetingService";
import { Meeting } from "@/types/meeting";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Users, FileText, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const MeetingList = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt,desc");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, sortBy]);

  const loadMeetings = async () => {
    try {
      setIsLoading(true);
      const response = await meetingService.getMeetings({
        page,
        size: 20,
        sort: sortBy,
      });
      
      let filtered = response.data || [];
      if (statusFilter !== "all") {
        filtered = filtered.filter(m => m.status === statusFilter);
      }
      
      setMeetings(filtered);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyles = (status?: string | null) => {
    if (!status) return { bg: "rgba(255,255,255,0.1)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.2)" };
    
    switch (status.toUpperCase()) {
      case 'PROCESSED': return { bg: "rgba(52,199,89,0.15)", text: "#34C759", border: "rgba(52,199,89,0.3)" };
      case 'PROCESSING': return { bg: "rgba(0,113,227,0.15)", text: "#0071E3", border: "rgba(0,113,227,0.3)" };
      case 'DRAFT': return { bg: "rgba(255,255,255,0.08)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.15)" };
      case 'FAILED': return { bg: "rgba(255,69,58,0.15)", text: "#FF453A", border: "rgba(255,69,58,0.3)" };
      default: return { bg: "rgba(255,255,255,0.1)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.2)" };
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-body)", fontSize: "0.8125rem", fontWeight: 500,
    color: "var(--text-secondary)", marginBottom: "0.375rem", display: "block",
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="display-sm mb-1.5" style={{ color: "var(--text-primary)" }}>All Meetings</h1>
          <p className="body-base">Browse and manage your meeting history</p>
        </div>
        <button 
          onClick={() => navigate('/create-meeting')} 
          className="btn-accent px-5 py-2.5 rounded-lg flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Create Meeting
        </button>
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div className="card-surface p-5 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label style={labelStyle}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
              <Input
                type="search"
                placeholder="Search meetings..."
                className="input-dark pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="input-dark bg-transparent">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="PROCESSED">Processed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label style={labelStyle}>Sort By</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="input-dark bg-transparent">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
                <SelectItem value="createdAt,desc">Newest First</SelectItem>
                <SelectItem value="createdAt,asc">Oldest First</SelectItem>
                <SelectItem value="updatedAt,desc">Recently Updated</SelectItem>
                <SelectItem value="scheduledTime,desc">Scheduled Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-surface p-6 animate-pulse flex flex-col gap-3">
              <div className="h-5 w-1/3 rounded" style={{ background: "var(--surface-raised)" }} />
              <div className="h-4 w-1/4 rounded" style={{ background: "var(--surface-raised)" }} />
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="card-surface p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 mb-4" style={{ color: "var(--text-tertiary)" }} />
          <h3 className="text-lg font-medium mb-2 font-display" style={{ color: "var(--text-primary)" }}>No meetings found</h3>
          <p className="body-sm mb-6 max-w-sm">
            {statusFilter !== "all"
              ? "No meetings match the selected filters. Try adjusting your search criteria."
              : "You haven't created any meetings yet."}
          </p>
          <button onClick={() => navigate('/create-meeting')} className="btn-accent px-6 py-2 rounded-lg">
            Create Meeting
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const styles = getStatusStyles(meeting.status);
            return (
              <div
                key={meeting.id}
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                className="card-surface p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover-lift cursor-pointer group"
              >
                <div className="space-y-2 flex-1 min-w-0 pr-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-medium text-base truncate font-display" style={{ color: "var(--text-primary)" }}>
                      {meeting.title}
                    </h3>
                    <span 
                      className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                      style={{ background: styles.bg, color: styles.text, border: `1px solid ${styles.border}` }}
                    >
                      {meeting.status?.toLowerCase() || 'unknown'}
                    </span>
                  </div>

                  {meeting.description && (
                    <p className="text-sm line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {meeting.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-body pt-1" style={{ color: "var(--text-tertiary)" }}>
                    {meeting.scheduledTime && (
                      <div className="flex items-center">
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        {format(new Date(meeting.scheduledTime), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                    <div className="flex items-center">
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      {meeting.attendeeCount} participants
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      {meeting.actionItemCount} tasks
                    </div>
                  </div>
                </div>

                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
                >
                  <ChevronRight className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────── */}
      {!isLoading && meetings.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Previous
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Page {page + 1}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={meetings.length < 20}
            className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingList;
