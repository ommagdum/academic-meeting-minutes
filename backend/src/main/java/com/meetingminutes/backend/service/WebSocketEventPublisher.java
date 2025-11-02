package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.websocket.ProcessingUpdateMessage;
import com.meetingminutes.backend.dto.websocket.WebSocketMessage;
import com.meetingminutes.backend.entity.MeetingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendProcessingUpdate(UUID meetingId, MeetingStatus status, int progress,
                                     String currentStep, String message) {
        ProcessingUpdateMessage update = ProcessingUpdateMessage.builder()
                .meetingId(meetingId)
                .status(status)
                .progress(progress)
                .currentStep(currentStep)
                .message(message)
                .timestamp(LocalDateTime.now())
                .estimatedCompletion(calculateEstimatedCompletion(progress))
                .build();

        String destination = "/topic/meetings/" + meetingId + "/processing";
        messagingTemplate.convertAndSend(destination, WebSocketMessage.builder()
                .type(WebSocketMessage.MessageType.PROCESSING_UPDATE)
                .message("Processing update")
                .data(update)
                .timestamp(LocalDateTime.now())
                .build());

        log.debug("WebSocket update sent for meeting {}: {}% - {}", meetingId, progress, currentStep);
    }

    public void sendProcessingComplete(UUID meetingId, String documentUrl, Integer actionItemsCreated) {
        ProcessingUpdateMessage completion = ProcessingUpdateMessage.builder()
                .meetingId(meetingId)
                .status(MeetingStatus.PROCESSED)
                .progress(100)
                .currentStep("COMPLETE")
                .message("Meeting processing completed successfully")
                .timestamp(LocalDateTime.now())
                .documentUrl(documentUrl)
                .actionItemsCreated(actionItemsCreated)
                .build();

        String destination = "/topic/meetings/" + meetingId + "/processing";

        messagingTemplate.convertAndSend(destination,
                WebSocketMessage.builder()
                        .type(WebSocketMessage.MessageType.PROCESSING_COMPLETE)
                        .message("Processing completed")
                        .data(completion)
                        .timestamp(LocalDateTime.now())
                        .build());

        log.info("WebSocket completion sent for meeting: {}", meetingId);
    }

    public void sendProcessingError(UUID meetingId, String errorMessage) {
        String destination = "/topic/meetings/" + meetingId + "/processing";

        messagingTemplate.convertAndSend(destination,
                WebSocketMessage.builder()
                        .type(WebSocketMessage.MessageType.PROCESSING_ERROR)
                        .message("Processing failed")
                        .data(ProcessingUpdateMessage.builder()
                                .meetingId(meetingId)
                                .status(MeetingStatus.FAILED)
                                .progress(0)
                                .currentStep("FAILED")
                                .message(errorMessage)
                                .timestamp(LocalDateTime.now())
                                .build())
                        .timestamp(LocalDateTime.now())
                        .build());

        log.error("WebSocket error sent for meeting {}: {}", meetingId, errorMessage);
    }

    public void sendUserNotification(String userId, WebSocketMessage message) {
        String destination = "/user/" + userId + "/queue/notifications";
        messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", message);
        log.debug("User notification sent to {}: {}", userId, message.getType());
    }

    private LocalDateTime calculateEstimatedCompletion(int progress) {
        if (progress >= 100) {
            return LocalDateTime.now();
        }

        int remainingPercent = 100 - progress;
        long estimatedSeconds = (remainingPercent * 30L) / 100;
        return LocalDateTime.now().plusSeconds(estimatedSeconds);
    }
}
