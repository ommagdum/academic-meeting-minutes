# models/schemas.py
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from datetime import datetime

class TranscriptionRequest(BaseModel):
    audio_file_path: str
    meeting_id: Optional[str] = None
    language: Optional[str] = "en"
    word_timestamps: bool = True

class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: Optional[float] = None

class TranscriptionResponse(BaseModel):
    raw_text: str
    word_timestamps: List[WordTimestamp]
    processing_time: float
    audio_duration: float
    confidence_score: float
    language: str
    success: bool
    error_message: Optional[str] = None

class ExtractionRequest(BaseModel):
    transcript_text: str
    meeting_id: Optional[str] = None
    agenda_items: Optional[List[Dict]] = []
    previous_context: Optional[Dict] = {}

class ExtractedDecision(BaseModel):
    topic: str
    decision: str
    context: str
    confidence: float

class ExtractedActionItem(BaseModel):
    description: str
    assignedTo: Optional[str] = None
    deadline: Optional[str] = None  # YYYY-MM-DD format
    confidence: float

class ExtractedTopic(BaseModel):
    agendaItem: str
    summary: str
    confidence: float

class ExtractedAttendee(BaseModel):
    name: str
    email: Optional[str] = None
    confidence: float

class ExtractedData(BaseModel):
    decisions: List[ExtractedDecision]
    actionItems: List[ExtractedActionItem]
    topicsDiscussed: List[ExtractedTopic]
    attendees: List[ExtractedAttendee]

class ExtractionResponse(BaseModel):
    extracted_data: ExtractedData
    processing_time: float
    model_version: str
    confidence_score: float
    success: bool
    error_message: Optional[str] = None
    raw_ai_response: Optional[str] = None
    fallback_used: Optional[bool] = False