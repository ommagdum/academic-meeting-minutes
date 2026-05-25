import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Plus, Trash2, TrendingUp, Clock, CheckCircle, AlertCircle, Edit3, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { meetingService } from '@/services/meetingService';
import type { MeetingSeries, MeetingSummary, ActionItem } from '@/types/meeting';

const statusColors = {
  DRAFT: { bg: "rgba(255,255,255,0.08)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.15)" },
  PROCESSING: { bg: "rgba(0,113,227,0.15)", text: "#0071E3", border: "rgba(0,113,227,0.3)" },
  PROCESSED: { bg: "rgba(52,199,89,0.15)", text: "#34C759", border: "rgba(52,199,89,0.3)" },
  FAILED: { bg: "rgba(255,69,58,0.15)", text: "#FF453A", border: "rgba(255,69,58,0.3)" },
};

const statusLabels = {
  DRAFT: 'Draft',
  PROCESSING: 'Processing',
  PROCESSED: 'Completed',
  FAILED: 'Failed',
};

export default function SeriesDetail() {
  const { id: seriesId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [series, setSeries] = useState<MeetingSeries | null>(null);
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  const loadActionItems = useCallback(async () => {
    if (!seriesId) return;
    setIsLoadingContext(true);
    try {
      const allActionItems: ActionItem[] = [];
      for (const meeting of meetings) {
        if (meeting.status === 'PROCESSED') {
          try {
            const items = await meetingService.getActionItems(meeting.id);
            allActionItems.push(...items);
          } catch (err) {
            console.warn(`Failed to load action items for meeting ${meeting.id}:`, err);
          }
        }
      }
      setActionItems(allActionItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: unknown) {
      console.error('Failed to load action items:', err);
    } finally {
      setIsLoadingContext(false);
    }
  }, [seriesId, meetings]);

  useEffect(() => {
    const loadSeriesData = async () => {
      if (!seriesId) {
        setError('No series ID provided');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const [seriesData, meetingsData] = await Promise.all([
          meetingService.getMeetingSeries(0).then(series => series.find(s => s.id === seriesId)),
          meetingService.getSeriesMeetings(seriesId)
        ]);
        if (!seriesData) {
          setError('Series not found');
          return;
        }
        setSeries(seriesData);
        setMeetings(meetingsData || []);
        setEditForm({ title: seriesData.title, description: seriesData.description || '' });
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(error?.response?.data?.message || 'Failed to load series data');
      } finally {
        setIsLoading(false);
      }
    };
    loadSeriesData();
  }, [seriesId]);

  useEffect(() => {
    if (meetings.length > 0) loadActionItems();
  }, [meetings, loadActionItems]);

  const handleDelete = async () => {
    if (!seriesId) return;
    setIsDeleting(true);
    try {
      await meetingService.deleteMeetingSeries(seriesId);
      navigate('/series');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Failed to delete series');
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!series) return;
    setEditForm({ title: series.title, description: series.description || '' });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!seriesId || !series) return;
    try {
      const updatedSeries = await meetingService.updateMeetingSeries(seriesId, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
      });
      setSeries(updatedSeries);
      setIsEditing(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || 'Failed to update series');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#0071E3" }} />
      </div>
    );
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center pt-20 text-center">
        <div className="card-surface p-8 max-w-md w-full">
          <p className="text-sm font-medium mb-2" style={{ color: "#FF453A" }}>{error || 'Series not found'}</p>
          <p className="body-sm mb-6">Please try again later.</p>
          <button onClick={() => navigate('/series')} className="btn-accent px-6 py-2 rounded-lg">Back to Series</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <button 
        onClick={() => navigate('/series')}
        className="flex items-center gap-2 mb-8 text-sm font-medium hover:text-[#0071E3] transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Series
      </button>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-10 card-surface p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="display-sm" style={{ color: "var(--text-primary)" }}>{series.title}</h1>
              <span className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider bg-white/10 text-white">
                {series.meetingCount} meetings
              </span>
            </div>
            {series.description && (
              <p className="body-base max-w-3xl mb-4">{series.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm font-body">
              <span style={{ color: "var(--text-tertiary)" }}>Created by {series.createdBy.name || series.createdBy.email}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span style={{ color: series.isActive ? "#34C759" : "var(--text-tertiary)" }}>
                {series.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={handleDelete}
              disabled={series?.meetingCount > 0 || isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ 
                border: "1px solid rgba(255,69,58,0.3)", 
                color: "#FF453A",
                background: series?.meetingCount > 0 ? "transparent" : "rgba(255,69,58,0.1)"
              }}
              title={series?.meetingCount > 0 ? "Cannot delete series with active meetings" : "Delete series"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isEditing && (
          <div className="p-6 mb-8 rounded-xl border" style={{ background: "rgba(0,0,0,0.2)", borderColor: "var(--border-strong)" }}>
            <h3 className="font-semibold text-lg mb-4" style={{ color: "var(--text-primary)" }}>Edit Series</h3>
            <div className="space-y-4">
              <div>
                <Label style={{ color: "var(--text-secondary)" }}>Series Title</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm(prev => ({...prev, title: e.target.value}))} className="input-dark mt-1" />
              </div>
              <div>
                <Label style={{ color: "var(--text-secondary)" }}>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))} className="input-dark mt-1" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm rounded-lg border border-white/20">Cancel</button>
                <button onClick={handleSaveEdit} className="btn-accent px-4 py-2 text-sm rounded-lg">Save Changes</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,113,227,0.1)" }}>
              <FileText className="w-6 h-6" style={{ color: "#0071E3" }} />
            </div>
            <div>
              <p className="text-2xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>{series.meetingCount}</p>
              <p className="text-sm font-body" style={{ color: "var(--text-secondary)" }}>Total Meetings</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,113,227,0.1)" }}>
              <Calendar className="w-6 h-6" style={{ color: "#0071E3" }} />
            </div>
            <div>
              <p className="text-2xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>
                {new Date(series.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <p className="text-sm font-body" style={{ color: "var(--text-secondary)" }}>Started</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,113,227,0.1)" }}>
              <TrendingUp className="w-6 h-6" style={{ color: "#0071E3" }} />
            </div>
            <div>
              <p className="text-2xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>
                {series.isActive ? 'Active' : 'Inactive'}
              </p>
              <p className="text-sm font-body" style={{ color: "var(--text-secondary)" }}>Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <Tabs defaultValue="meetings" className="space-y-6">
        <TabsList className="w-full flex justify-start h-auto p-1 bg-transparent border-b rounded-none" style={{ borderColor: "var(--border-subtle)" }}>
          <TabsTrigger value="meetings" className="px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#0071E3] data-[state=active]:text-white rounded-none bg-transparent hover:bg-white/5 text-white/50">
            Meetings
          </TabsTrigger>
          <TabsTrigger value="context" className="px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#0071E3] data-[state=active]:text-white rounded-none bg-transparent hover:bg-white/5 text-white/50">
            Previous Context
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meetings">
          <div className="card-surface p-0 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
              <div>
                <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Meetings</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>All meetings in this series</p>
              </div>
              <button 
                onClick={() => navigate(`/create-meeting?seriesId=${seriesId}`)}
                className="btn-accent px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Meeting
              </button>
            </div>
            
            <div className="divide-y" style={{ divideColor: "var(--border-subtle)" }}>
              {meetings.length === 0 ? (
                <div className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No meetings in this series yet.
                </div>
              ) : (
                meetings.map(m => {
                  const s = statusColors[m.status] || statusColors.DRAFT;
                  return (
                    <div 
                      key={m.id} 
                      onClick={() => navigate(`/meetings/${m.id}`)}
                      className="p-4 px-6 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>{m.title}</h4>
                          <span 
                            className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
                            style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                          >
                            {statusLabels[m.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {m.scheduledTime ? new Date(m.scheduledTime).toLocaleDateString() : 'Unscheduled'}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {m.attendeeCount}</span>
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {m.actionItemCount} tasks</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium hover:underline" style={{ color: "#0071E3" }}>View</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="context">
          <div className="card-surface p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5" style={{ color: "#0071E3" }} />
              <div>
                <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Previous Context</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Action items and decisions from previous meetings</p>
              </div>
            </div>

            {isLoadingContext ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-white/5" />)}
              </div>
            ) : actionItems.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--text-secondary)" }} />
                <h4 className="text-base font-medium mb-1" style={{ color: "var(--text-primary)" }}>No Previous Context</h4>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No action items found from previous meetings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {actionItems.map(item => (
                  <div key={item.id} className="p-4 rounded-lg border hover:bg-white/[0.02] transition-colors" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className={`px-2 py-0.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/70'}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        <span style={{ color: "var(--text-tertiary)" }}>From: {item.meetingTitle}</span>
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{item.description}</p>
                    {(item.assignedToUser || item.deadline) && (
                      <div className="flex items-center gap-4 text-xs font-body" style={{ color: "var(--text-secondary)" }}>
                        {item.assignedToUser && <span>Assigned: {item.assignedToUser.name || item.assignedToUser.email}</span>}
                        {item.deadline && <span>Due: {new Date(item.deadline).toLocaleDateString()}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
