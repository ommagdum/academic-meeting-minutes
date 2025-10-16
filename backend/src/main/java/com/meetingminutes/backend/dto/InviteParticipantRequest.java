package com.meetingminutes.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class InviteParticipantRequest {
    private List<String> emails;
    private String message;
}
