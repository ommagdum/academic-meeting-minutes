package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String name;
    private String profilePictureUrl;
    private UserRole role;
    private LocalDateTime lastLogin;
    private Boolean emailVerified;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        if (user == null) {
            return null;
        }

        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .profilePictureUrl(user.getProfilePictureUrl())
                .role(user.getRole())
                .lastLogin(user.getLastLogin())
                .emailVerified(user.getEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
