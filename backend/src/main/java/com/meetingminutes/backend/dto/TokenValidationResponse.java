package com.meetingminutes.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenValidationResponse {
    private boolean valid;
    private String message;
    private String meetingTitle;
    private String organizerName;
}
