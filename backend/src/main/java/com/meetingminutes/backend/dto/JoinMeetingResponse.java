package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.AttendanceStatus;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class JoinMeetingResponse {
    private UUID meetingId;
    private String meetingTitle;
    private AttendanceStatus status;
    private String message;
}
