package com.meetingminutes.backend.dto;

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
public class ProcessingStatusResponse {
    private UUID meetingId;
    private MeetingStatus status;
    private int progress; // 0-100
    private String currentStep;
    private String message;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}