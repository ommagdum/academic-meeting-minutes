package com.meetingminutes.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.meetingminutes.backend.document.WordTimestamp;
import lombok.Data;

import java.util.List;

@Data
public class TranscriptionResponse {
    private Boolean success;

    @JsonProperty("raw_text")
    private String rawText;

    @JsonProperty("word_timestamps")
    private List<WordTimestamp> wordTimestamps;

    @JsonProperty("processing_time")
    private Double processingTime;

    @JsonProperty("audio_duration")
    private Double audioDuration;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    private String language;

    @JsonProperty("device_used")
    private String deviceUsed;

    @JsonProperty("meeting_id")
    private String meetingId;

    public boolean isSuccess() {
        return Boolean.TRUE.equals(success);
    }

}
