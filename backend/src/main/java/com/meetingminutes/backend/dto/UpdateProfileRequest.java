package com.meetingminutes.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z\\s.'-]+$", message = "Name can only contain letters, spaces, apostrophes, and hyphens")
    private String name;

    @Size(max = 500, message = "Profile picture URL cannot exceed 500 characters")
    @Pattern(regexp = "^(https?://.*\\.(?:png|jpg|jpeg|gif|webp))?$",
            message = "Profile picture must be a valid image URL (png, jpg, jpeg, gif, webp)")
    private String profilePictureUrl;
}
