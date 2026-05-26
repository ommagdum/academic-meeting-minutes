import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export type Priority = 1 | 2 | 3;

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
}

export interface ActionItemResponse {
  id: string;
  description: string;
  assignedToUser: TaskAssignee | null;
  assignedToEmail: string | null;
  deadline: string | null;
  status: TaskStatus;
  priority: Priority;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  completedAt: string | null;
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  1: 'rgba(52,199,89,0.15)',
  2: 'rgba(255,159,10,0.15)',
  3: 'rgba(255,69,58,0.15)',
};

export const PRIORITY_TEXT: Record<Priority, string> = {
  1: '#34C759',
  2: '#FF9F0A',
  3: '#FF453A',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
};

// ── Service ────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/action-items';

const unwrap = <T>(res: { data: T | { data: T } }): T => {
  const d = res.data as any;
  return d?.data !== undefined ? d.data : d;
};

export const taskService = {
  /** Fetch all tasks for the current user, optionally filtered by status */
  getMyTasks: async (status?: TaskStatus): Promise<ActionItemResponse[]> => {
    const params = status ? { status } : {};
    const res = await api.get<ActionItemResponse[]>(`${BASE}/my-tasks`, { params });
    return unwrap(res);
  },

  /** Fetch tasks where deadline has passed and status is not COMPLETED/CANCELLED */
  getOverdueTasks: async (): Promise<ActionItemResponse[]> => {
    const res = await api.get<ActionItemResponse[]>(`${BASE}/overdue`);
    return unwrap(res);
  },

  /** Fetch tasks where acknowledged === false */
  getUnacknowledgedTasks: async (): Promise<ActionItemResponse[]> => {
    const res = await api.get<ActionItemResponse[]>(`${BASE}/unacknowledged`);
    return unwrap(res);
  },

  /** Get count of tasks for a given status */
  getTaskCount: async (status: TaskStatus): Promise<number> => {
    const res = await api.get<number>(`${BASE}/count`, { params: { status } });
    return unwrap(res);
  },

  /** Update the status of a task */
  updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<ActionItemResponse> => {
    const res = await api.patch<ActionItemResponse>(`${BASE}/${taskId}/status`, { status });
    return unwrap(res);
  },

  /** Mark a task as acknowledged (call silently when a task is viewed) */
  acknowledgeTask: async (taskId: string): Promise<ActionItemResponse> => {
    const res = await api.post<ActionItemResponse>(`${BASE}/${taskId}/acknowledge`);
    return unwrap(res);
  },

  /** Reassign a task to a new email address */
  reassignTask: async (taskId: string, assignee: string): Promise<ActionItemResponse> => {
    const res = await api.patch<ActionItemResponse>(`${BASE}/${taskId}/assign`, { assignee });
    return unwrap(res);
  },
};
