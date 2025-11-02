package com.meetingminutes.backend.dto.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebSocketMessage {
    private MessageType type;
    private String message;
    private Object data;
    private LocalDateTime timestamp;

    public enum MessageType {
        PROCESSING_UPDATE,
        PROCESSING_COMPLETE,
        PROCESSING_ERROR,
        TASK_ASSIGNED,
        DOCUMENT_GENERATED,
        PARTICIPANT_JOINED,
        MEETING_UPDATED
    }
}
