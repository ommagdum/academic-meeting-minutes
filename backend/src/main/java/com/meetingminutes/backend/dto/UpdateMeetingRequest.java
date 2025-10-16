package com.meetingminutes.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class UpdateMeetingRequest {
    @NotBlank(message = "Meeting title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String agendaText;
    private Boolean usePreviousContext;
    private LocalDateTime scheduledTime;

    private UUID seriesId;
    private String newSeriesTitle;

    private List<CreateAgendaItemRequest> agendaItems;
}