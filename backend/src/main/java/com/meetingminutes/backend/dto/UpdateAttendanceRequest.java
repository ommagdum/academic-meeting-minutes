package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.AttendanceStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class UpdateAttendanceRequest {
    private AttendanceStatus status;
}
