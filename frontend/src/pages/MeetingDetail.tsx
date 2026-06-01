import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { meetingService } from "@/services/meetingService";
import { Meeting, ProcessingStatus, ActionItem, Attendee } from "@/types/meeting";
import { TranscriptTab } from "@/components/meeting/TranscriptTab";
import TaskItem from "@/components/meeting/TaskItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProcessingStatusBanner } from "@/components/meeting/ProcessingStatusBanner";
import { ArrowLeft, Users, FileText, Download, Edit, UserPlus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AxiosError } from "axios";
import { ParticipantsTab } from '@/components/meeting/ParticipantsTab';
import { EditMeetingModal } from '@/components/meeting/EditMeetingModal';
import { InviteParticipantsModal } from '@/components/meeting/InviteParticipantsModal';
import { useAuth } from '@/hooks/useAuth';

const MeetingDetail = () => {
  const { id: meetingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [actionItems, setActionItems] = useState<ActionItem[] | null>(null);
  const [isLoadingActionItems, setIsLoadingActionItems] = useState(false);
  const [actionItemsError, setActionItemsError] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({ description: '', assignedToEmail: '', deadline: '', priority: 1 });

  const loadMeeting = useCallback(async () => {
    if (!meetingId) {
      setError('No meeting ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const timestamp = new Date().getTime();
      const data = await meetingService.getMeeting(`${meetingId}?t=${timestamp}`);
      
      if (!data) throw new Error('No data received from server');
      setMeeting(data);

      if (data.status === 'PROCESSING' || data.status === 'DRAFT') {
        try {
          const status = await meetingService.getProcessingStatus(meetingId);
          setProcessingStatus(status);
          // Do not update meeting status here to avoid race conditions with loadMeeting
        } catch (statusError) {
          console.error('[MeetingDetail] Error getting processing status:', statusError);
        }
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const errorMessage = axiosError.response?.data?.message || axiosError.message || 'Failed to load meeting';
      setError(errorMessage);
      
      if (axiosError.response?.status === 403) {
        toast({ title: "Access Denied", description: "You don't have permission to view this meeting", variant: "destructive" });
        navigate('/meetings');
      } else if (axiosError.response?.status === 404) {
        toast({ title: "Meeting Not Found", description: "The requested meeting does not exist or has been deleted", variant: "destructive" });
        navigate('/meetings');
      } else if (axiosError.response?.status === 401) {
        toast({ title: "Session Expired", description: "Please log in again to continue", variant: "destructive" });
        navigate('/login');
      } else {
        toast({ title: 'Error Loading Meeting', description: errorMessage, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, navigate, toast]);

  const loadAttendees = useCallback(async () => {
    if (!meetingId) return;
    try {
      setIsLoadingAttendees(true);
      const response = await meetingService.getMeetingAttendees(meetingId, { page: 0, size: 100 });
      setAttendees(response.attendees);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load attendees';
      toast({ title: "Error Loading Attendees", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingAttendees(false);
    }
  }, [meetingId, toast]);

  const handleTaskUpdate = useCallback((updatedTask: ActionItem) => {
    setActionItems(prev => prev ? prev.map(task => task.id === updatedTask.id ? updatedTask : task) : null);
  }, []);

  const handleTaskDelete = useCallback((taskId: string) => {
    setActionItems(prev => prev ? prev.filter(task => task.id !== taskId) : null);
  }, []);

  const handlePublishTasks = async () => {
    if (!meetingId) return;
    setIsPublishing(true);
    try {
      await meetingService.publishActionItems(meetingId);
      toast({ title: "Published", description: "All draft action items have been published." });
      const items = await meetingService.getActionItems(meetingId);
      setActionItems(items);
    } catch (error) {
      toast({ title: "Failed to Publish", description: "Failed to publish action items.", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCreateTask = async () => {
    if (!meetingId || !newTask.description.trim()) return;
    setIsCreatingTask(true);
    try {
      await meetingService.createActionItem(meetingId, {
        description: newTask.description,
        assignedToEmail: newTask.assignedToEmail || null,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
        priority: newTask.priority
      });
      toast({ title: "Task Created", description: "New action item has been added." });
      setShowAddTask(false);
      setNewTask({ description: '', assignedToEmail: '', deadline: '', priority: 1 });
      const items = await meetingService.getActionItems(meetingId);
      setActionItems(items);
    } catch (error) {
      toast({ title: "Failed to Create", description: "Failed to create action item.", variant: "destructive" });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleEditSuccess = useCallback((updatedMeeting: Meeting) => {
    setMeeting(updatedMeeting);
    toast({ title: "Success", description: "Meeting updated successfully." });
  }, [toast]);

  const handleInviteSuccess = useCallback((invitedCount: number) => {
    toast({ title: "Invitations Sent", description: `Successfully sent invitations to ${invitedCount} participant(s).` });
    loadAttendees();
  }, [toast, loadAttendees]);

  const handleRetry = useCallback(async () => {
    if (!meetingId) return;
    try {
      await meetingService.startProcessing(meetingId);
      toast({ title: "Processing Started", description: "Your meeting is being reprocessed" });
      await loadMeeting();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing';
      toast({ title: "Failed to Start Processing", description: errorMessage, variant: "destructive" });
    }
  }, [meetingId, toast, loadMeeting]);

  useEffect(() => {
    if (meetingId) {
      loadMeeting().catch(console.error);
      loadAttendees();
    } else {
      setError('No meeting ID provided');
      setIsLoading(false);
    }
  }, [meetingId, loadMeeting, loadAttendees]);

  useEffect(() => {
    if (!meetingId || !meeting) return;
    if (meeting.status !== 'DRAFT' && meeting.status !== 'PROCESSING') return;

    const pollStatus = async () => {
      try {
        const status = await meetingService.getProcessingStatus(meetingId);
        setProcessingStatus(status);
        if (status.status === 'PROCESSED' || status.status === 'FAILED') {
          // Fetch full meeting object which will naturally trigger status change and interval cleanup
          await loadMeeting();
        }
      } catch (error) {
        console.error('[MeetingDetail] Failed to fetch processing status:', error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [meetingId, meeting, loadMeeting]);

  useEffect(() => {
    const loadActionItems = async () => {
      if (activeTab !== "tasks" || !meetingId) return;
      try {
        setIsLoadingActionItems(true);
        setActionItemsError(null);
        const items = await meetingService.getActionItems(meetingId);
        setActionItems(items);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load action items';
        setActionItemsError(errorMessage);
        toast({ title: "Error Loading Action Items", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoadingActionItems(false);
      }
    };
    loadActionItems();
  }, [activeTab, meetingId, toast]);

  const handleDownloadPDF = async () => {
    if (!meetingId) return;
    try {
      const filename = meeting?.title ? `${meeting.title.replace(/[^a-zA-Z0-9\s]/g, '_')}.pdf` : 'minutes.pdf';
      await meetingService.downloadLatestDocument(meetingId, 'pdf', filename);
      toast({ title: 'Download Started', description: 'PDF download started successfully.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download PDF';
      toast({ title: 'Download Failed', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDownloadDOCX = async () => {
    if (!meetingId) return;
    try {
      const filename = meeting?.title ? `${meeting.title.replace(/[^a-zA-Z0-9\s]/g, '_')}.docx` : 'minutes.docx';
      await meetingService.downloadLatestDocument(meetingId, 'docx', filename);
      toast({ title: 'Download Started', description: 'DOCX download started successfully.' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download DOCX';
      toast({ title: 'Download Failed', description: errorMessage, variant: 'destructive' });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#0071E3" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="card-surface p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-3" style={{ color: "#FF453A" }}>Error Loading Meeting</h2>
          <p className="body-sm mb-6">{error}</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => loadMeeting()} className="btn-accent py-2 rounded-lg">Retry</button>
            <button onClick={() => navigate('/meetings')} className="py-2 rounded-lg transition-colors" style={{ background: "var(--surface-raised)", color: "var(--text-primary)" }}>
              Back to Meetings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) return null;

  const isMeetingOwner = currentUser?.id === meeting.createdBy.id;
  const statusStyles = getStatusStyles(meeting.status);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Top Bar ───────────────────────────────────────────── */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => navigate('/meetings')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </button>
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <h1 className="display-sm" style={{ color: "var(--text-primary)" }}>{meeting.title}</h1>
              <span 
                className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                style={{ background: statusStyles.bg, color: statusStyles.text, border: `1px solid ${statusStyles.border}` }}
              >
                {meeting.status?.toLowerCase() || 'unknown'}
              </span>
            </div>
            {meeting.description && (
              <p className="body-base max-w-3xl">{meeting.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {isMeetingOwner && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            {meeting.minutesDocumentUrl && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="btn-accent flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Download Minutes
                    <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}>
                  <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer hover:bg-white/5">
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadDOCX} className="cursor-pointer hover:bg-white/5">
                    <FileText className="w-4 h-4 mr-2" />
                    Download DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-body" style={{ color: "var(--text-tertiary)" }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{meeting.attendeeCount} participants</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{meeting.actionItemCount} action items</span>
          </div>
        </div>
      </div>

      {(meeting.status === 'PROCESSING' || meeting.status === 'FAILED') && processingStatus && (
        <div className="mb-8">
          <ProcessingStatusBanner
            status={processingStatus}
            onRetry={meeting.status === 'FAILED' ? handleRetry : undefined}
          />
        </div>
      )}

      {/* ── Content Tabs ──────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList 
          className="w-full flex justify-start h-auto p-1 bg-transparent border-b rounded-none"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {['overview', 'transcript', 'tasks', 'participants'].map((tab) => {
            const isDisabled = (tab === 'transcript' || tab === 'tasks') && meeting.status !== 'PROCESSED';
            return (
              <TabsTrigger 
                key={tab}
                value={tab} 
                disabled={isDisabled}
                className="px-6 py-3 text-sm font-medium transition-all data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 rounded-none bg-transparent hover:bg-white/5 disabled:opacity-30"
                style={{ 
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                  borderColor: activeTab === tab ? "#0071E3" : "transparent"
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <div className="card-surface p-8 space-y-8">
            <h2 className="text-xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>Meeting Overview</h2>
            
            {meeting.agendaText && (
              <div>
                <h3 className="label-caps mb-3" style={{ color: "var(--text-secondary)" }}>Agenda</h3>
                <p className="body-base whitespace-pre-wrap">{meeting.agendaText}</p>
              </div>
            )}
            
            <div>
              <h3 className="label-caps mb-4" style={{ color: "var(--text-secondary)" }}>Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Created by</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{meeting.createdBy.name}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Created at</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{format(new Date(meeting.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Last updated</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{format(new Date(meeting.updatedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transcript">
          <div className="card-surface p-8">
            <h2 className="text-xl font-semibold mb-6 font-display" style={{ color: "var(--text-primary)" }}>Transcript</h2>
            {meetingId && <TranscriptTab meetingId={meetingId} />}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <div className="card-surface p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>Action Items</h2>
              {isMeetingOwner && (
                <button 
                  onClick={() => setShowAddTask(!showAddTask)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors btn-accent"
                >
                  <FileText className="w-4 h-4" />
                  Add Task
                </button>
              )}
            </div>

            {isMeetingOwner && actionItems?.some(item => item.status === 'DRAFT') && (
              <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center justify-between">
                <div className="text-sm text-amber-800">
                  <span className="font-semibold">{actionItems.filter(item => item.status === 'DRAFT').length} action items</span> are AI-generated drafts pending your review. Assignees cannot see these until you publish them.
                </div>
                <button 
                  onClick={handlePublishTasks}
                  disabled={isPublishing}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
                >
                  {isPublishing ? "Publishing..." : "Publish All"}
                </button>
              </div>
            )}

            {showAddTask && isMeetingOwner && (
              <div className="mb-6 p-4 border rounded-lg" style={{ background: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
                <h3 className="font-semibold mb-4 text-sm" style={{ color: "var(--text-primary)" }}>Add New Action Item</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Description *</label>
                    <textarea 
                      className="w-full text-sm border rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                      value={newTask.description}
                      onChange={e => setNewTask({...newTask, description: e.target.value})}
                      placeholder="What needs to be done?"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Assign to (Email)</label>
                      <input 
                        type="email"
                        className="w-full text-sm border rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                        value={newTask.assignedToEmail}
                        onChange={e => setNewTask({...newTask, assignedToEmail: e.target.value})}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Deadline</label>
                      <input 
                        type="date"
                        className="w-full text-sm border rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                        value={newTask.deadline}
                        onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Priority</label>
                      <select 
                        className="w-full text-sm border rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent"
                        style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                        value={newTask.priority}
                        onChange={e => setNewTask({...newTask, priority: Number(e.target.value)})}
                      >
                        <option value={1} className="dark:bg-slate-800">Low</option>
                        <option value={2} className="dark:bg-slate-800">Medium</option>
                        <option value={3} className="dark:bg-slate-800">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={() => setShowAddTask(false)}
                      className="px-4 py-2 text-sm font-medium border rounded transition-colors hover:bg-white/5"
                      style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
                      disabled={isCreatingTask}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateTask}
                      disabled={isCreatingTask || !newTask.description.trim()}
                      className="px-4 py-2 text-sm font-medium rounded btn-accent disabled:opacity-50"
                    >
                      {isCreatingTask ? "Saving..." : "Save Task"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoadingActionItems ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg" style={{ background: "var(--surface-raised)" }} />)}
              </div>
            ) : actionItemsError ? (
              <div className="text-sm" style={{ color: "#FF453A" }}>{actionItemsError}</div>
            ) : !actionItems || actionItems.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>No action items found.</div>
            ) : (
              <div className="space-y-4">
                {actionItems.map(item => (
                  <TaskItem
                    key={item.id}
                    task={item}
                    meetingId={meetingId!}
                    isOrganizer={meeting?.createdBy?.id === currentUser?.id}
                    currentUser={currentUser}
                    attendees={attendees}
                    onTaskUpdate={handleTaskUpdate}
                    onTaskDelete={handleTaskDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="participants">
          <div className="card-surface p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold font-display" style={{ color: "var(--text-primary)" }}>Participants</h2>
              {isMeetingOwner && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text-primary)" }}
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              )}
            </div>
            {meetingId && <ParticipantsTab meetingId={meetingId} />}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {meeting && (
        <EditMeetingModal
          meeting={meeting}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
      {meetingId && (
        <InviteParticipantsModal
          meetingId={meetingId}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  );
};

export default MeetingDetail;
