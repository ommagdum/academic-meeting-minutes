package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
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
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getProfilePictureUrl(),
                user.getRole(),
                user.getLastLogin(),
                user.getEmailVerified(),
                user.getCreatedAt()
        );
    }
}
