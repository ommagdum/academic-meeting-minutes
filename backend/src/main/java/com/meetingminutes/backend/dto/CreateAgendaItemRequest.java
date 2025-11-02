package com.meetingminutes.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class CreateAgendaItemRequest {
    private String title;
    private String description;
    private Integer estimatedDuration;
    private Integer orderIndex;

    public CreateAgendaItemRequest(String title, String description, Integer estimatedDuration) {
        this.title = title;
        this.description = description;
        this.estimatedDuration = estimatedDuration;
    }
}
