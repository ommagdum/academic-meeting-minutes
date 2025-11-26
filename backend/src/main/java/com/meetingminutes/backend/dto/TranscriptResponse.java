package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.document.WordTimestamp;
import com.meetingminutes.backend.dto.ai.TranscriptionResponse;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TranscriptResponse {
    private String id;
    private String rawText;
    private List<WordTimestamp> wordTimestamps;
    private Double processingTime;
    private Double audioDuration;
    private Double confidenceScore;
    private String language;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String deviceUsed;

    public static TranscriptResponse from(Transcript transcript) {
        if (transcript == null) {
            return null;
        }

        return TranscriptResponse.builder()
                .id(transcript.getId())
                .rawText(transcript.getRawText())
                .wordTimestamps(transcript.getWordTimestamps())
                .processingTime(transcript.getProcessingTime())
                .audioDuration(transcript.getAudioDuration())
                .confidenceScore(transcript.getConfidenceScore())
                .language(transcript.getLanguage())
                .createdAt(transcript.getCreatedAt())
                .updatedAt(transcript.getUpdatedAt())
                .deviceUsed(transcript.getDeviceUsed())
                .build();
    }
}
