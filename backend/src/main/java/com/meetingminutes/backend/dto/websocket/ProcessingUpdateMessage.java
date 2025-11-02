package com.meetingminutes.backend.dto.websocket;

import com.meetingminutes.backend.entity.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessingUpdateMessage {
    private UUID meetingId;
    private MeetingStatus status;
    private int progress;
    private String currentStep;
    private String message;
    private LocalDateTime timestamp;
    private LocalDateTime estimatedCompletion;

    private String transcriptId;
    private String extractionId;
    private Integer actionItemsCreated;
    private String documentUrl;
}
