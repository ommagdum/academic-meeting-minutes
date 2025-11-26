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
public class AttendeeDetailResponse {
    private UUID id;
    private String name;           // user.name or extracted from inviteEmail
    private String email;          // user.email or inviteEmail
    private Boolean isOrganizer;
    private AttendanceStatus status;
    private LocalDateTime invitedAt;
    private LocalDateTime respondedAt;
    private LocalDateTime joinedAt;
    private String notes;
    private UUID userId;           // null for external users
    private Boolean isRegistered;  // true if user exists in system

    public static AttendeeDetailResponse from(com.meetingminutes.backend.entity.Attendee attendee) {
        String name;
        String email;
        UUID userId = null;
        Boolean isRegistered = false;

        if (attendee.getUser() != null) {
            // Registered user
            name = attendee.getUser().getName();
            email = attendee.getUser().getEmail();
            userId = attendee.getUser().getId();
            isRegistered = true;
        } else {
            // External user
            email = attendee.getInviteEmail();
            name = extractNameFromEmail(email); // Extract name from email
            isRegistered = false;
        }

        return AttendeeDetailResponse.builder()
                .id(attendee.getId())
                .name(name)
                .email(email)
                .isOrganizer(attendee.getIsOrganizer())
                .status(attendee.getStatus())
                .invitedAt(attendee.getInvitedAt())
                .respondedAt(attendee.getRespondedAt())
                .joinedAt(attendee.getJoinedAt())
                .notes(attendee.getNotes())
                .userId(userId)
                .isRegistered(isRegistered)
                .build();
    }

    private static String extractNameFromEmail(String email) {
        if (email == null || email.isEmpty()) {
            return "Unknown User";
        }

        // Extract name part from email (e.g., "john.doe@example.com" -> "John Doe")
        String namePart = email.split("@")[0];
        String[] nameParts = namePart.split("\\.");

        StringBuilder name = new StringBuilder();
        for (String part : nameParts) {
            if (!part.isEmpty()) {
                name.append(Character.toUpperCase(part.charAt(0)))
                        .append(part.substring(1))
                        .append(" ");
            }
        }

        return name.toString().trim();
    }
}
