import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
  ActionItemResponse,
  TaskStatus,
  PRIORITY_LABELS,
  PRIORITY_TEXT,
  PRIORITY_COLORS,
  STATUS_LABELS,
  taskService,
} from '@/services/taskService';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_OPTIONS: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

interface TaskModalProps {
  task: ActionItemResponse;
  onClose: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const TaskModal = ({ task, onClose, onStatusChange }: TaskModalProps) => {
  const navigate = useNavigate();
  const hasAcknowledged = useRef(false);

  // Auto-acknowledge on open
  useEffect(() => {
    if (!task.acknowledged && !hasAcknowledged.current) {
      hasAcknowledged.current = true;
      taskService.acknowledgeTask(task.id).catch(console.error);
    }
  }, [task.id, task.acknowledged]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const priority = (task.priority ?? 2) as 1 | 2 | 3;
  const isDeadlinePast = task.deadline && isPast(parseISO(task.deadline));
  const assigneeName = task.assignedToUser?.name ?? task.assignedToEmail ?? 'Unassigned';
  const assigneeEmail = task.assignedToUser?.email ?? task.assignedToEmail;
  const assigneeInitial = assigneeName[0]?.toUpperCase() ?? '?';

  const formattedDeadline = task.deadline
    ? format(parseISO(task.deadline), 'MMM d, yyyy · h:mm a')
    : 'No deadline';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg card-surface p-0 overflow-hidden"
        style={{ animation: 'fade-in 150ms ease-out' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 p-6 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: PRIORITY_COLORS[priority], color: PRIORITY_TEXT[priority] }}
              >
                {PRIORITY_LABELS[priority]}
              </span>
              {isDeadlinePast && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  Overdue
                </span>
              )}
              {!task.acknowledged && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                  New
                </span>
              )}
            </div>
            <h2
              className="text-base font-semibold font-display leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {task.description}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Meeting */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,113,227,0.12)', border: '1px solid rgba(0,113,227,0.2)' }}
            >
              <ExternalLink className="w-4 h-4" style={{ color: '#0071E3' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>From meeting</p>
              <button
                onClick={() => { navigate(`/meetings/${task.meetingId}`); onClose(); }}
                className="text-sm font-medium hover:text-[#0071E3] transition-colors truncate block max-w-full text-left"
                style={{ color: 'var(--text-primary)' }}
              >
                {task.meetingTitle}
              </button>
            </div>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            {task.assignedToUser?.profilePictureUrl ? (
              <img
                src={task.assignedToUser.profilePictureUrl}
                alt={assigneeName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                style={{ background: 'rgba(0,113,227,0.15)', color: '#0071E3' }}
              >
                {task.assignedToUser ? assigneeInitial : <User className="w-4 h-4" />}
              </div>
            )}
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Assigned to</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{assigneeName}</p>
              {assigneeEmail && assigneeName !== assigneeEmail && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{assigneeEmail}</p>
              )}
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: isDeadlinePast && task.status !== 'COMPLETED' ? 'rgba(255,69,58,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isDeadlinePast && task.status !== 'COMPLETED' ? 'rgba(255,69,58,0.2)' : 'var(--border-subtle)'}`,
              }}
            >
              <Calendar
                className="w-4 h-4"
                style={{ color: isDeadlinePast && task.status !== 'COMPLETED' ? '#FF453A' : 'var(--text-secondary)' }}
              />
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Deadline</p>
              <p
                className="text-sm font-medium"
                style={{ color: isDeadlinePast && task.status !== 'COMPLETED' ? '#FF453A' : 'var(--text-primary)' }}
              >
                {formattedDeadline}
              </p>
            </div>
          </div>

          {/* Completed at */}
          {task.completedAt && (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.2)' }}
              >
                <CheckCircle className="w-4 h-4" style={{ color: '#34C759' }} />
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Completed</p>
                <p className="text-sm font-medium" style={{ color: '#34C759' }}>
                  {format(parseISO(task.completedAt), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
            </div>
          )}

          {/* Status selector */}
          <div
            className="pt-4 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p className="text-xs mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Update Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(task.id, s)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150"
                  style={
                    task.status === s
                      ? { background: '#0071E3', color: '#fff' }
                      : { background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer meta */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Created {format(parseISO(task.createdAt), 'MMM d, yyyy')}
          </span>
          {task.acknowledged && task.acknowledgedAt && (
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3" />
              Seen {format(parseISO(task.acknowledgedAt), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
