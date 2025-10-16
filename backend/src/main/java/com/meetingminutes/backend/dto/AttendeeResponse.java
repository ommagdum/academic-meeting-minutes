package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.AttendanceStatus;
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
public class AttendeeResponse {
    private UUID id;
    private UserResponse user; // null for external invites
    private String inviteEmail; // for non-registered users
    private AttendanceStatus status;
    private Boolean isOrganizer;
    private LocalDateTime invitedAt;
    private LocalDateTime joinedAt;
    private LocalDateTime respondedAt;
    private UUID meetingId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AttendeeResponse from(com.meetingminutes.backend.entity.Attendee attendee) {
        return AttendeeResponse.builder()
                .id(attendee.getId())
                .user(UserResponse.from(attendee.getUser()))
                .inviteEmail(attendee.getInviteEmail())
                .status(attendee.getStatus())
                .isOrganizer(attendee.getIsOrganizer())
                .invitedAt(attendee.getInvitedAt())
                .joinedAt(attendee.getJoinedAt())
                .respondedAt(attendee.getRespondedAt())
                .meetingId(attendee.getMeeting().getId())
                .createdAt(attendee.getCreatedAt())
                .updatedAt(attendee.getUpdatedAt())
                .build();
    }
}