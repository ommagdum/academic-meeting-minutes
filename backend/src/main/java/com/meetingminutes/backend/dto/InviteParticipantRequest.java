package com.meetingminutes.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@Getter
@Setter
public class InviteParticipantRequest {
    @NotEmpty(message = "At least one email is required")
    @Size(max = 50, message = "Cannot invite more than 50 participants at once")
    private List<@Email(message = "Invalid email format") String> emails;

    @Size(max = 500, message = "Invitation message cannot exceed 500 characters")
    private String message;
}
