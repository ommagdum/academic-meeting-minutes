package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.MeetingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingDetailResponse {
    private UUID id;
    private String title;
    private String description;
    private MeetingStatus status;
    private String agendaText;
    private Boolean usePreviousContext;
    private LocalDateTime scheduledTime;
    private LocalDateTime actualStartTime;
    private LocalDateTime actualEndTime;

    private UserResponse createdBy;
    private MeetingSeriesResponse series;
    private List<AgendaItemResponse> agendaItems;
    private List<AttendeeResponse> attendees;
    private List<ActionItemResponse> actionItems;

    private String transcriptId;
    private String aiExtractionId;
    private String minutesDocumentUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}