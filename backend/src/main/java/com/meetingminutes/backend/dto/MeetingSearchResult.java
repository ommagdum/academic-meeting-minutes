package com.meetingminutes.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingSearchResult {
    private String meetingId;
    private String title;
    private String description;
    private String highlight;
    private Double relevanceScore;
    private String status;
    private LocalDateTime meetingDate;
    private LocalDateTime createdAt;
    private List<String> matchingFields;
    private Integer participantCount;
    private Integer actionItemCount;
    private Boolean hasTranscript;
    private String seriesTitle;
}
