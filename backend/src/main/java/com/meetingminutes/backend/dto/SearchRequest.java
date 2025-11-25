package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.MeetingStatus;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class SearchRequest {

    @Size(max = 100,message = "Search query cannot exceed 100 characters")
    private String query;

    private LocalDateTime fromDate;
    private LocalDateTime toDate;

    private List<MeetingStatus> statuses;
    private List<UUID> participantIds;
    private UUID seriesId;

    private Boolean hasActionItems;
    private Boolean hasTranscript;

    private String category; // "recent", "upcoming", "processed", "withActions", "withTranscript"

    private String dateGrouping; // "day", "week", "month"

    private String sortBy = "relevance";

    private String sortDirection = "desc";

    private int page = 0;
    private int size = 20;

    public void validateDateRange() {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException("From date cannot be after to date");
        }
    }
}
