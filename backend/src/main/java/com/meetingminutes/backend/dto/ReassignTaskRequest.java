package com.meetingminutes.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ReassignTaskRequest {
    private String assignee; // email or userId
}
