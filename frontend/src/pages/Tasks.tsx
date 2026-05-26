import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckSquare, AlertCircle, Bell, RefreshCw, Loader2 } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  taskService,
  ActionItemResponse,
  TaskStatus,
  PRIORITY_LABELS,
  PRIORITY_TEXT,
  PRIORITY_COLORS,
  STATUS_LABELS,
} from '@/services/taskService';
import TaskModal from '@/components/tasks/TaskModal';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ────────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'PENDING',     label: 'Pending',     color: 'rgba(255,159,10,0.15)' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'rgba(0,113,227,0.15)'  },
  { status: 'COMPLETED',   label: 'Completed',   color: 'rgba(52,199,89,0.12)'  },
  { status: 'CANCELLED',   label: 'Cancelled',   color: 'rgba(255,255,255,0.05)'},
];

const STAT_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];

const STAT_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'Pending',     color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' },
  IN_PROGRESS: { label: 'In Progress', color: '#0071E3', bg: 'rgba(0,113,227,0.12)'  },
  COMPLETED:   { label: 'Completed',   color: '#34C759', bg: 'rgba(52,199,89,0.12)'  },
  OVERDUE:     { label: 'Overdue',     color: '#FF453A', bg: 'rgba(255,69,58,0.12)'  },
};

// ── Task Card ──────────────────────────────────────────────────────────────────

const TaskCard = ({
  task,
  onClick,
  onDragStart,
}: {
  task: ActionItemResponse;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) => {
  const priority = (task.priority ?? 2) as 1 | 2 | 3;
  const isDeadlinePast =
    task.deadline &&
    isPast(parseISO(task.deadline)) &&
    task.status !== 'COMPLETED' &&
    task.status !== 'CANCELLED';
  const assigneeName = task.assignedToUser?.name ?? task.assignedToEmail ?? 'Unassigned';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className="group w-full text-left p-3.5 rounded-xl cursor-pointer transition-all duration-150 select-none hover-lift"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Top badges row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: PRIORITY_COLORS[priority], color: PRIORITY_TEXT[priority] }}
        >
          {PRIORITY_LABELS[priority]}
        </span>
        {isDeadlinePast && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
            Overdue
          </span>
        )}
        {!task.acknowledged && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-[#60a5fa]">
            New
          </span>
        )}
      </div>

      {/* Description */}
      <p
        className="text-sm font-medium line-clamp-2 mb-3 leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        {task.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] truncate max-w-[120px]"
          style={{ color: 'var(--text-tertiary)' }}
          title={task.meetingTitle}
        >
          {task.meetingTitle}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {task.deadline && (
            <span
              className="text-[10px] font-medium"
              style={{ color: isDeadlinePast ? '#FF453A' : 'var(--text-tertiary)' }}
            >
              {format(parseISO(task.deadline), 'MMM d')}
            </span>
          )}
          {/* Assignee avatar */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
            style={{ background: 'rgba(0,113,227,0.2)', color: '#0071E3' }}
          >
            {task.assignedToUser?.profilePictureUrl ? (
              <img src={task.assignedToUser.profilePictureUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              assigneeName[0]?.toUpperCase()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Kanban Column ──────────────────────────────────────────────────────────────

const KanbanColumn = ({
  status,
  label,
  color,
  tasks,
  onCardClick,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: ActionItemResponse[];
  onCardClick: (task: ActionItemResponse) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onDragOver: (e: React.DragEvent) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className="flex flex-col min-w-[260px] flex-1 rounded-xl p-4 transition-all duration-150"
      style={{
        background: isDragOver ? 'rgba(0,113,227,0.06)' : 'var(--surface)',
        border: `1px solid ${isDragOver ? 'rgba(0,113,227,0.3)' : 'var(--border-subtle)'}`,
        minHeight: '400px',
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); onDragOver(e); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); onDrop(e, status); }}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: color.replace('0.15', '0.8').replace('0.12', '0.8').replace('0.05', '0.3') }}
        />
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        <span
          className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {tasks.length === 0 ? (
          <div
            className="flex-1 flex items-center justify-center rounded-lg border-dashed border text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)', minHeight: '80px' }}
          >
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onCardClick(task)}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

const Tasks = () => {
  const { toast } = useToast();

  const [tasks, setTasks] = useState<ActionItemResponse[]>([]);
  const [unacknowledged, setUnacknowledged] = useState<ActionItemResponse[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, OVERDUE: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ActionItemResponse | null>(null);
  const dragTaskId = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTasks, unacknowledgedTasks, ...statCounts] = await Promise.all([
        taskService.getMyTasks().catch(() => []),
        taskService.getUnacknowledgedTasks().catch(() => []),
        ...STAT_STATUSES.map((s) => taskService.getTaskCount(s).catch(() => 0)),
      ]);

      setTasks(allTasks);
      setUnacknowledged(unacknowledgedTasks);
      setCounts(
        STAT_STATUSES.reduce((acc, s, i) => ({ ...acc, [s]: statCounts[i] }), {} as Record<string, number>)
      );
    } catch (err) {
      console.error('[Tasks] Failed to load:', err);
      toast({ title: 'Error', description: 'Failed to load tasks.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const updated = await taskService.updateTaskStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
    } catch {
      toast({ title: 'Error', description: 'Could not update task status.', variant: 'destructive' });
    }
  }, [toast]);

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragTaskId.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = dragTaskId.current;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    await handleStatusChange(taskId, targetStatus);
    dragTaskId.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // Group tasks by status for kanban
  const tasksByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = tasks.filter((t) => t.status === col.status);
    return acc;
  }, {} as Record<TaskStatus, ActionItemResponse[]>);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="display-sm mb-1" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
          <p className="body-base">Action items assigned to you from your meetings.</p>
        </div>
        <button
          onClick={loadAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover-scale"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-secondary)' }} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_STATUSES.map((s) => {
          const meta = STAT_META[s];
          return (
            <div
              key={s}
              className="card-surface p-5"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                style={{ background: meta.bg }}
              >
                {s === 'OVERDUE' ? (
                  <AlertCircle className="w-4 h-4" style={{ color: meta.color }} />
                ) : s === 'COMPLETED' ? (
                  <CheckSquare className="w-4 h-4" style={{ color: meta.color }} />
                ) : (
                  <CheckSquare className="w-4 h-4" style={{ color: meta.color }} />
                )}
              </div>
              <p className="text-3xl font-bold font-display mb-1" style={{ color: meta.color }}>
                {isLoading ? '—' : counts[s] ?? 0}
              </p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{meta.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Unacknowledged alert ────────────────────────────────── */}
      {unacknowledged.length > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{ background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.2)' }}
        >
          <Bell className="w-4 h-4 shrink-0" style={{ color: '#0071E3' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            You have{' '}
            <span style={{ color: '#0071E3' }}>{unacknowledged.length} new task{unacknowledged.length > 1 ? 's' : ''}</span>
            {' '}— click any card to review.
          </p>
        </div>
      )}

      {/* ── Loading state ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0071E3' }} />
        </div>
      ) : (
        /* ── Kanban Board ────────────────────────────────────────── */
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              tasks={tasksByStatus[col.status] ?? []}
              onCardClick={setSelectedTask}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      )}

      {/* ── Task Modal ───────────────────────────────────────────── */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default Tasks;
