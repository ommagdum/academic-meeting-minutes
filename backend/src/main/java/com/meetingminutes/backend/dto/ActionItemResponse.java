package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionItemResponse {
    private UUID id;
    private String description;
    private UserResponse assignedToUser; // null for external assignees
    private String assignedToEmail; // for external assignees
    private LocalDateTime deadline;
    private TaskStatus status;
    private Boolean acknowledged;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime completedAt;
    private UUID meetingId;

    private String meetingTitle;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ActionItemResponse from(ActionItem actionItem) {
        if (actionItem == null) {
            return null;
        }

        return ActionItemResponse.builder()
                .id(actionItem.getId())
                .description(actionItem.getDescription())
                .assignedToUser(UserResponse.from(actionItem.getAssignedToUser()))
                .assignedToEmail(actionItem.getAssignedToEmail())
                .deadline(actionItem.getDeadline())
                .status(actionItem.getStatus())
                .acknowledged(actionItem.getAcknowledged())
                .acknowledgedAt(actionItem.getAcknowledgedAt())
                .completedAt(actionItem.getCompletedAt())
                .createdAt(actionItem.getCreatedAt())
                .meetingId(actionItem.getMeeting() != null ? actionItem.getMeeting().getId() : null)
                .meetingTitle(actionItem.getMeeting() != null ? actionItem.getMeeting().getTitle() : null)
                .build();
    }
}