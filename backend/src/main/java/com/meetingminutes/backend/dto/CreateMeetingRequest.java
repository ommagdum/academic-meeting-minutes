package com.meetingminutes.backend.dto;

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
    private String title;
    private String description;
    private UUID seriesId;
    private String newSeriesTitle;
    private String agendaText;
    private Boolean usePreviousContext = false;
    private LocalDateTime scheduledTime;
    private List<CreateAgendaItemRequest> agendaItems;
    private List<String> participantEmails;
}
