import { ActionItemResponse } from "@/services/taskService";
import { CheckSquare, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface UrgentTasksWidgetProps {
  tasks: ActionItemResponse[];
}

export const UrgentTasksWidget = ({ tasks }: UrgentTasksWidgetProps) => {
  const navigate = useNavigate();
  // Filter for pending/in_progress/overdue and sort by deadline then priority
  const urgentTasks = tasks
    .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    .sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.priority - a.priority;
    })
    .slice(0, 4);

  if (urgentTasks.length === 0) {
    return (
      <div className="card-surface p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(52,199,89,0.15)", color: "#34C759" }}>
          <CheckSquare className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>All caught up!</h3>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>You have no pending tasks right now.</p>
      </div>
    );
  }

  return (
    <div className="card-surface p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" style={{ color: "#FF9F0A" }} />
          <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Urgent Tasks</h3>
        </div>
        <button 
          onClick={() => navigate('/tasks')}
          className="text-xs font-medium hover:underline"
          style={{ color: "#0071E3" }}
        >
          View all
        </button>
      </div>

      <div className="space-y-3 flex-1">
        {urgentTasks.map(task => {
          const isOverdue = task.status === 'OVERDUE' || (task.deadline && new Date(task.deadline) < new Date());
          return (
            <div 
              key={task.id}
              onClick={() => navigate(`/meetings/${task.meetingId}`)}
              className="p-3 rounded-lg border transition-all cursor-pointer hover:bg-white/5"
              style={{ 
                borderColor: isOverdue ? 'rgba(255,59,48,0.3)' : 'var(--border-subtle)',
                background: isOverdue ? 'rgba(255,59,48,0.05)' : 'transparent'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-4 h-4 rounded border" style={{ borderColor: 'var(--text-tertiary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {task.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <span className="truncate max-w-[120px]">{task.meetingTitle}</span>
                    {task.deadline && (
                      <span className="flex items-center gap-1" style={{ color: isOverdue ? '#FF3B30' : 'var(--text-tertiary)' }}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.deadline), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
