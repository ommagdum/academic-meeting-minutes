package com.meetingminutes.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MeetingDetailsFromToken {
    private UUID meetingId;
    private String meetingTitle;
    private String meetingDescription;
    private String organizerName;
    private String organizerEmail;
    private LocalDateTime scheduledTime;
    private boolean requiresAuthentication;
}
