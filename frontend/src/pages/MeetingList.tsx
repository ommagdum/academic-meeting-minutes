import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchService, MeetingSearchResult, AdvancedSearchRequest } from "@/services/searchService";
import { Plus, Search, Calendar, Users, ChevronRight, CheckCircle, FileText, SlidersHorizontal, X } from "lucide-react";
import { format } from "date-fns";

// ── Filter tabs (use backend category endpoint where possible) ──────────────
type FilterTab = {
  id: string;
  label: string;
  category?: string;        // maps to GET /category/{cat}
  statusFilter?: string[];  // maps to POST /meetings statuses[]
};

const TABS: FilterTab[] = [
  { id: "all",          label: "All" },
  { id: "recent",       label: "Recent",      category: "recent" },
  { id: "upcoming",     label: "Upcoming",    category: "upcoming" },
  { id: "processed",    label: "Processed",   category: "processed" },
  { id: "withActions",  label: "Has Actions", category: "withActions" },
  { id: "withTranscript", label: "Has Transcript", category: "withTranscript" },
];

const SORT_OPTIONS = [
  { value: "relevance",     label: "Relevance"      },
  { value: "scheduledTime", label: "Scheduled Date" },
  { value: "createdAt",     label: "Created Date"   },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PROCESSED:  { bg: "rgba(52,199,89,0.15)",  text: "#34C759", border: "rgba(52,199,89,0.3)"  },
  PROCESSING: { bg: "rgba(0,113,227,0.15)",  text: "#0071E3", border: "rgba(0,113,227,0.3)"  },
  DRAFT:      { bg: "rgba(255,255,255,0.08)",text: "var(--text-secondary)", border: "rgba(255,255,255,0.15)" },
  FAILED:     { bg: "rgba(255,69,58,0.15)",  text: "#FF453A", border: "rgba(255,69,58,0.3)"  },
};

const getStatusStyle = (status?: string | null) =>
  STATUS_STYLES[(status ?? "").toUpperCase()] ??
  { bg: "rgba(255,255,255,0.1)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.2)" };

const PAGE_SIZE = 20;

// ── Component ────────────────────────────────────────────────────────────────

const MeetingList = () => {
  const navigate = useNavigate();

  const [meetings, setMeetings]       = useState<MeetingSearchResult[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [activeTab, setActiveTab]     = useState<string>("all");
  const [sortBy, setSortBy]           = useState<string>("createdAt");
  const [sortDir, setSortDir]         = useState<"asc"|"desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSortPanel, setShowSortPanel]   = useState(false);

  // Debounce search input 300ms (respect backend rate limiter)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(val);
      setPage(0);
    }, 300);
  };

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    try {
      const tab = TABS.find(t => t.id === activeTab);

      let response;

      if (tab?.category && !debouncedQuery) {
        // Use the fast category endpoint when no text query
        response = await searchService.searchByCategory(
          tab.category, page, PAGE_SIZE, sortBy, sortDir
        );
      } else {
        // Fall back to advanced POST search (supports text + status filters)
        const req: AdvancedSearchRequest = {
          page,
          size: PAGE_SIZE,
          sortBy: sortBy as any,
          sortDirection: sortDir,
          ...(debouncedQuery ? { query: debouncedQuery } : {}),
          ...(tab?.statusFilter ? { statuses: tab.statusFilter } : {}),
          ...(tab?.category && !tab.statusFilter ? { category: tab.category } : {}),
        };
        response = await searchService.advancedSearch(req);
      }

      setMeetings(response?.results ?? []);
      setTotalPages(response?.totalPages ?? 0);
      setTotalResults(response?.totalResults ?? 0);
    } catch (err) {
      console.error("[MeetingList] load failed:", err);
      setMeetings([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, sortBy, sortDir, debouncedQuery]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setPage(0);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setPage(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
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

      {/* ── Search bar + sort toggle ─────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="search"
            placeholder="Search meetings by title, description or agenda…"
            className="input-dark w-full pl-9 pr-9"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowSortPanel(v => !v)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: showSortPanel ? "rgba(0,113,227,0.15)" : "var(--surface-raised)",
            border: `1px solid ${showSortPanel ? "rgba(0,113,227,0.4)" : "var(--border-subtle)"}`,
            color: showSortPanel ? "#0071E3" : "var(--text-secondary)",
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Sort</span>
        </button>
      </div>

      {/* ── Sort panel ───────────────────────────────────────────── */}
      {showSortPanel && (
        <div
          className="card-surface p-4 mb-5 flex flex-wrap items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Sort by</span>
            <div className="flex gap-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setPage(0); }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={
                    sortBy === opt.value
                      ? { background: "#0071E3", color: "#fff" }
                      : { background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Direction</span>
            <div className="flex gap-1">
              {(["desc", "asc"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => { setSortDir(d); setPage(0); }}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                  style={
                    sortDir === d
                      ? { background: "#0071E3", color: "#fff" }
                      : { background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }
                  }
                >
                  {d === "desc" ? "Newest first" : "Oldest first"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto scrollbar-none pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap transition-all duration-150 shrink-0"
            style={
              activeTab === tab.id
                ? { background: "#0071E3", color: "#fff" }
                : { background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }
            }
          >
            {tab.label}
          </button>
        ))}
        {totalResults > 0 && (
          <span className="ml-auto shrink-0 text-xs font-medium pl-4" style={{ color: "var(--text-tertiary)" }}>
            {totalResults.toLocaleString()} result{totalResults !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Meeting list ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card-surface p-6 animate-pulse flex flex-col gap-3">
              <div className="h-5 w-1/3 rounded" style={{ background: "var(--surface-raised)" }} />
              <div className="h-4 w-1/4 rounded" style={{ background: "var(--surface-raised)" }} />
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="card-surface p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 mb-4" style={{ color: "var(--text-tertiary)" }} />
          <h3 className="text-lg font-medium mb-2 font-display" style={{ color: "var(--text-primary)" }}>
            No meetings found
          </h3>
          <p className="body-sm mb-6 max-w-sm">
            {debouncedQuery
              ? `No results for "${debouncedQuery}". Try a different search term.`
              : activeTab !== "all"
                ? "No meetings match this filter. Try a different category."
                : "You haven't created any meetings yet."}
          </p>
          {debouncedQuery ? (
            <button onClick={clearSearch} className="btn-ghost px-6 py-2 rounded-lg">
              Clear search
            </button>
          ) : (
            <button onClick={() => navigate('/create-meeting')} className="btn-accent px-6 py-2 rounded-lg">
              Create Meeting
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(meeting => {
            const styles = getStatusStyle(meeting.status);
            const meetingId = meeting.id || (meeting as any).meetingId;
            return (
              <div
                key={meetingId}
                onClick={() => navigate(`/meetings/${meetingId}`)}
                className="card-surface p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover-lift cursor-pointer group"
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

                  {(meeting as any).description && (
                    <p className="text-sm line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {(meeting as any).description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-body pt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {meeting.scheduledTime && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(meeting.scheduledTime), 'MMM dd, yyyy · HH:mm')}
                      </div>
                    )}
                    {meeting.attendeeCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {meeting.attendeeCount} participant{meeting.attendeeCount !== 1 ? "s" : ""}
                      </div>
                    )}
                    {meeting.actionItemCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {meeting.actionItemCount} task{meeting.actionItemCount !== 1 ? "s" : ""}
                      </div>
                    )}
                    {meeting.seriesTitle && (
                      <div className="flex items-center gap-1.5 text-[#0071E3]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3]" />
                        {meeting.seriesTitle}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────── */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          >
            Previous
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-40 transition-colors"
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
