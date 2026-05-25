package com.meetingminutes.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Token is required")
    private String token;

    @NotBlank(message = "New password is required")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d\\s])[^\\s]{8,}$",
            message = "Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special character (no spaces allowed)."
    )
    private String newPassword;
}
