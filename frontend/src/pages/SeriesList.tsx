import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, FileText, Plus, Search, FolderOpen, User, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { meetingService } from '@/services/meetingService';
import type { MeetingSeries } from '@/types/meeting';

export default function SeriesList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [series, setSeries] = useState<MeetingSeries[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSeries = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await meetingService.getMeetingSeries();
        setSeries(data || []);
      } catch (e: unknown) {
        const error = e as { response?: { data?: { message?: string } } };
        setError(error?.response?.data?.message || 'Failed to load series');
      } finally {
        setIsLoading(false);
      }
    };
    loadSeries();
  }, []);

  const filteredSeries = series.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="display-sm mb-1.5" style={{ color: "var(--text-primary)" }}>Meeting Series</h1>
          <p className="body-base">Manage your recurring meeting series</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg font-medium text-sm transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
          >
            Back to Dashboard
          </button>
          <button 
            onClick={() => navigate('/create-series')}
            className="flex-1 sm:flex-none btn-accent px-5 py-2.5 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Series
          </button>
        </div>
      </div>

      {/* ── Search ────────────────────────────────────────────── */}
      <div className="card-surface p-5 mb-8 max-w-md">
        <label className="text-xs font-medium block mb-1.5 font-body" style={{ color: "var(--text-secondary)" }}>Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
          <Input
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-9"
          />
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-surface p-6 animate-pulse space-y-4">
              <div className="h-6 w-3/4 rounded" style={{ background: "var(--surface-raised)" }} />
              <div className="h-4 w-full rounded" style={{ background: "var(--surface-raised)" }} />
              <div className="h-10 w-full rounded mt-6" style={{ background: "var(--surface-raised)" }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card-surface p-8 text-center flex flex-col items-center max-w-md mx-auto mt-10">
          <p className="text-sm font-medium mb-2" style={{ color: "#FF453A" }}>{error}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Please try again later.</p>
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="card-surface p-16 flex flex-col items-center justify-center text-center">
          <FolderOpen className="h-12 w-12 mb-4" style={{ color: "var(--text-tertiary)" }} />
          <h3 className="text-lg font-medium mb-2 font-display" style={{ color: "var(--text-primary)" }}>No Series Found</h3>
          <p className="body-sm mb-6 max-w-md">
            {searchQuery
              ? "No series match your search. Try different keywords."
              : "Create your first meeting series to organize recurring meetings."}
          </p>
          <button onClick={() => navigate('/create-series')} className="btn-accent px-6 py-2 rounded-lg flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create First Series
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSeries.map((s) => (
            <Link key={s.id} to={`/series/${s.id}`} className="block group">
              <div className="card-surface p-6 h-full flex flex-col hover-lift cursor-pointer transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold font-display line-clamp-2 transition-colors group-hover:text-[#0071E3]" style={{ color: "var(--text-primary)" }}>
                    {s.title}
                  </h3>
                  <span 
                    className="text-xs font-semibold px-2 py-1 rounded-md shrink-0 ml-3"
                    style={{ background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
                  >
                    {s.meetingCount}
                  </span>
                </div>
                <p className="text-sm mb-6 flex-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {s.description || 'No description provided.'}
                </p>
                
                <div className="space-y-3 mb-6 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{s.meetingCount} meetings</span>
                  </div>
                  <div className="flex items-center text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate">Created by {s.createdBy.name || s.createdBy.email}</span>
                  </div>
                  <div className="flex items-center text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Started {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-sm font-medium" style={{ color: "#0071E3" }}>View Details</span>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1"
                    style={{ background: "rgba(0,113,227,0.1)", color: "#0071E3" }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
