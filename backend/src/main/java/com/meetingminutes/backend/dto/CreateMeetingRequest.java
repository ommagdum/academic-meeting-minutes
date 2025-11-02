package com.meetingminutes.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@NoArgsConstructor
@Getter
@Setter
public class CreateMeetingRequest {

    @NotBlank(message = "Meeting title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private UUID seriesId;

    @Size(max = 255, message = "Series title cannot exceed 255 characters")
    private String newSeriesTitle;

    @Size(max = 5000, message = "Agenda text cannot exceed 5000 characters")
    private String agendaText;

    private Boolean usePreviousContext = false;

    @Future(message = "Scheduled time must be in the future")
    private LocalDateTime scheduledTime;

    @Valid
    @Size(max = 20, message = "Cannot have more than 20 agenda items")
    private List<CreateAgendaItemRequest> agendaItems;

    @Valid
    @Size(max = 50, message = "Cannot invite more than 50 participants")
    private List<@Email(message = "Invalid email format") String> participantEmails;

    public void validateSeriesSelection() {
        if (seriesId != null && newSeriesTitle != null) {
            throw new IllegalArgumentException("Cannot specify both seriesId and newSeriesTitle");
        }
    }
}
