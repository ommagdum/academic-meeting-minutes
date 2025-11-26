import { User } from './user';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  scheduledTime?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  attendeeCount: number;
  agendaItemCount: number;
  actionItemCount: number;
  seriesId?: string;
  transcriptId?: string;
  aiExtractionId?: string;
  minutesDocumentUrl?: string;
  agendaText?: string;
  usePreviousContext?: boolean;
}

export interface AgendaItem {
  title: string;
  description?: string;
  estimatedDuration: number;
  orderIndex: number;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  agendaText?: string;
  agendaItems: AgendaItem[];
  scheduledTime?: string;
  usePreviousContext?: boolean;
  seriesId?: string;
  newSeriesTitle?: string;
}

export interface MeetingSeries {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  meetingCount: number;
}

export interface ProcessingStatus {
  meetingId: string;
  status: 'PROCESSING' | 'PROCESSED' | 'FAILED';
  progress: number;
  currentStep: string;
  message: string;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  filePath: string;
  fileSize: string;
  fileName: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignedToUser?: User | null;
  assignedToEmail?: string | null;
  deadline?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
  meetingId: string;
  meetingTitle?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Attendee {
  id: string;
  name: string;
  email: string;
  isOrganizer: boolean;
  status: 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'ATTENDED' | 'NO_SHOW';
  invitedAt: string;
  respondedAt: string | null;
  joinedAt: string | null;
  notes?: string;
  userId: string | null;
  isRegistered: boolean;
}

export interface AttendeesResponse {
  attendees: Attendee[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
  last: boolean;
}