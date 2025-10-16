package com.meetingminutes.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessingResponse {
    private boolean success;
    private String message;
    private UUID meetingId;
    private boolean processingStarted;
    private Integer estimatedTimeMinutes;
}