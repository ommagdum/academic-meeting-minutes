package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingSeries;
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
public class MeetingSeriesResponse {
    private UUID id;
    private String title;
    private String description;
    private UserResponse createdBy;
    private Boolean isActive;
    private Integer meetingCount;

    private List<MeetingSummaryResponse> recentMeetings;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MeetingSeriesResponse from(MeetingSeries series) {
        if (series == null) {
            return null;
        }

        return MeetingSeriesResponse.builder()
                .id(series.getId())
                .title(series.getTitle())
                .description(series.getDescription())
                .createdBy(UserResponse.from(series.getCreatedBy()))
                .isActive(series.getIsActive())
                .meetingCount(series.getMeetingCount()) // Use the helper method
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }

    public static MeetingSeriesResponse fromMeeting(Meeting meeting) {
        if (meeting == null || meeting.getSeries() == null) {
            return null;
        }

        MeetingSeries series = meeting.getSeries();
        return MeetingSeriesResponse.builder()
                .id(series.getId())
                .title(series.getTitle())
                .description(series.getDescription())
                .createdBy(UserResponse.from(series.getCreatedBy()))
                .isActive(series.getIsActive())
                .meetingCount(series.getMeetingCount()) // Use the helper method
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }

    public static MeetingSeriesResponse withRecentMeetings(MeetingSeries series, List<MeetingSummaryResponse> recentMeetings) {
        MeetingSeriesResponse response = from(series);
        if (response != null) {
            response.setRecentMeetings(recentMeetings);
        }
        return response;
    }

    public static MeetingSeriesResponse simpleFrom(MeetingSeries series) {
        if (series == null) {
            return null;
        }

        return MeetingSeriesResponse.builder()
                .id(series.getId())
                .title(series.getTitle())
                .description(series.getDescription())
                .createdBy(UserResponse.from(series.getCreatedBy()))
                .isActive(series.getIsActive())
                // Don't set meetingCount to avoid lazy loading
                .createdAt(series.getCreatedAt())
                .updatedAt(series.getUpdatedAt())
                .build();
    }
}