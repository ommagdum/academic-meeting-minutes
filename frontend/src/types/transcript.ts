export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Transcript {
  id: string;
  rawText: string;
  wordTimestamps: WordTimestamp[];
  processingTime: number;
  audioDuration: number;
  confidenceScore: number;
  language: string;
  createdAt: string;
  updatedAt: string;
  deviceUsed: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
