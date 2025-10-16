package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.Meeting;
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
public class MeetingSummaryResponse {
    private UUID id;
    private String title;
    private String description;
    private MeetingStatus status;
    private LocalDateTime scheduledTime;
    private LocalDateTime actualStartTime;
    private LocalDateTime actualEndTime;

    private int attendeeCount;
    private int agendaItemCount;
    private int actionItemCount;

    private UserResponse createdBy;

    private UUID seriesId;
    private String seriesTitle;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MeetingSummaryResponse from(Meeting meeting) {
        if (meeting == null) {
            return null;
        }

        return MeetingSummaryResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription()) // ✅ ADDED
                .status(meeting.getStatus())
                .scheduledTime(meeting.getScheduledTime())
                .actualStartTime(meeting.getActualStartTime()) // ✅ ADDED
                .actualEndTime(meeting.getActualEndTime()) // ✅ ADDED
                .createdBy(meeting.getCreatedBy() != null ?
                        UserResponse.from(meeting.getCreatedBy()) : null) // ✅ ADDED
                .seriesId(meeting.getSeries() != null ?
                        meeting.getSeries().getId() : null) // ✅ ADDED
                .seriesTitle(meeting.getSeries() != null ?
                        meeting.getSeries().getTitle() : null) // ✅ ADDED
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt()) // ✅ ADDED
                .attendeeCount(meeting.getAttendees() != null ? meeting.getAttendees().size() : 0)
                .agendaItemCount(meeting.getAgendaItems() != null ? meeting.getAgendaItems().size() : 0)
                .actionItemCount(meeting.getActionItems() != null ? meeting.getActionItems().size() : 0)
                .build();
    }
}