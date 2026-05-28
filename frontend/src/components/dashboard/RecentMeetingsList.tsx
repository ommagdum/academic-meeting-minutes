import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Clock, Users, CheckCircle, ChevronRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MeetingSearchResult } from "@/services/searchService";

interface RecentMeetingsListProps {
  meetings: MeetingSearchResult[];
  isLoading?: boolean;
}

export const RecentMeetingsList = ({ meetings, isLoading }: RecentMeetingsListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const getStatusStyles = (status?: string | null) => {
    if (!status) return { bg: "rgba(255,255,255,0.1)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.2)" };
    
    switch (status.toUpperCase()) {
      case 'PROCESSED':
        return { bg: "rgba(52,199,89,0.15)", text: "#34C759", border: "rgba(52,199,89,0.3)" };
      case 'PROCESSING':
        return { bg: "rgba(0,113,227,0.15)", text: "#0071E3", border: "rgba(0,113,227,0.3)" };
      case 'DRAFT':
        return { bg: "rgba(255,255,255,0.08)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.15)" };
      case 'FAILED':
        return { bg: "rgba(255,69,58,0.15)", text: "#FF453A", border: "rgba(255,69,58,0.3)" };
      default:
        return { bg: "rgba(255,255,255,0.1)", text: "var(--text-secondary)", border: "rgba(255,255,255,0.2)" };
    }
  };


  if (isLoading) {
    return (
      <div className="card-surface p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold mb-5 font-display" style={{ color: "var(--text-primary)" }}>
          Recent Meetings
        </h2>
        <div className="space-y-4 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 rounded-lg" style={{ background: "var(--surface-raised)" }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="card-surface p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold mb-5 font-display" style={{ color: "var(--text-primary)" }}>
          Recent Meetings
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-10 h-10 mb-4" style={{ color: "var(--text-tertiary)" }} />
          <h3 className="text-base font-medium mb-2" style={{ color: "var(--text-primary)" }}>No meetings yet</h3>
          <p className="body-sm mb-6 max-w-[200px]">Create your first meeting to get started</p>
          <button 
            onClick={() => navigate('/create-meeting')}
            className="btn-accent px-6 py-2 rounded-lg text-sm"
          >
            Create Meeting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface p-0 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <h2 className="text-base font-semibold font-display" style={{ color: "var(--text-primary)" }}>
          Recent Meetings
        </h2>
        <button 
          onClick={() => navigate('/meetings')}
          className="text-xs font-medium hover:underline underline-offset-2"
          style={{ color: "#0071E3" }}
        >
          View All
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col divide-y" style={{ divideColor: "var(--border-subtle)" }}>
          {meetings.map((meeting) => {
            const styles = getStatusStyles(meeting.status);
            return (
              <div
                key={meeting.id}
                className="flex items-center justify-between p-4 px-6 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                onClick={() => {
                  if (!meeting?.id) {
                    toast({
                      title: 'Error',
                      description: 'Could not open meeting: Missing meeting ID',
                      variant: 'destructive',
                    });
                    return;
                  }
                  navigate(`/meetings/${encodeURIComponent(meeting.id)}`);
                }}
              >
                <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                      {meeting.title}
                    </h3>
                    <span 
                      className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                      style={{ 
                        background: styles.bg, 
                        color: styles.text,
                        border: `1px solid ${styles.border}`
                      }}
                    >
                      {meeting.status?.toLowerCase() || 'unknown'}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-body" style={{ color: "var(--text-tertiary)" }}>
                    <div className="flex items-center">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {meeting.createdAt ? format(new Date(meeting.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                    </div>
                    {meeting.attendeeCount > 0 && (
                      <div className="flex items-center">
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        {meeting.attendeeCount}
                      </div>
                    )}
                    {meeting.actionItemCount > 0 && (
                      <div className="flex items-center">
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        {meeting.actionItemCount} tasks
                      </div>
                    )}
                    {meeting.hasTranscript && (
                      <div className="flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        Transcript
                      </div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  style={{ background: "var(--surface-raised)" }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
