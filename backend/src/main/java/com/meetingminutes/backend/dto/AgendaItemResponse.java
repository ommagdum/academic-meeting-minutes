package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.AgendaItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendaItemResponse {
    private UUID id;
    private String title;
    private String description;
    private Integer orderIndex;
    private Duration estimatedDuration;
    private UUID meetingId;

    // Timestamps
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;


    public static AgendaItemResponse from(AgendaItem agendaItem) {
        return AgendaItemResponse.builder()
                .id(agendaItem.getId())
                .title(agendaItem.getTitle())
                .description(agendaItem.getDescription())
                .orderIndex(agendaItem.getOrderIndex())
                .estimatedDuration(Duration.ofMinutes(agendaItem.getEstimatedDuration()))
                .meetingId(agendaItem.getMeeting().getId())
                .createdAt(agendaItem.getCreatedAt())
                .updatedAt(agendaItem.getUpdatedAt())
                .build();
    }
}