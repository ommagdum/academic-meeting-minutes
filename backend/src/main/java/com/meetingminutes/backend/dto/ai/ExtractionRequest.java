package com.meetingminutes.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.meetingminutes.backend.dto.CreateAgendaItemRequest;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
public class ExtractionRequest {

    @JsonProperty("transcript_text")
    private String transcriptText;

    @JsonProperty("meeting_id")
    private UUID meetingId;

    @JsonProperty("agenda_items")
    private List<CreateAgendaItemRequest> agendaItems;

    @JsonProperty("previous_context")
    private Map<String, Object> previousContext;

    public ExtractionRequest(String transcriptText, UUID meetingId, List<CreateAgendaItemRequest> agendaItems) {
        this.transcriptText = transcriptText;
        this.meetingId = meetingId;
        this.agendaItems = agendaItems;
    }
}
