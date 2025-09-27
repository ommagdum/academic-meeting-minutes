package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class User extends BaseEntity{

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String name;

    private String profilePictureUrl;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.PARTICIPANT;

    @Column(unique = true)
    private String googleId;

    private LocalDateTime lastLogin;

    private Boolean emailVerified = false;

    private String createdBy;
    private String updatedBy;
}
