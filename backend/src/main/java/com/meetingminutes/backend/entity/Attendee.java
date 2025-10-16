package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendees")
@Getter
@Setter
public class Attendee extends BaseEntity{

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // null for external invites

    private String inviteEmail; // for non-registered users

    @Enumerated(EnumType.STRING)
    private AttendanceStatus status = AttendanceStatus.INVITED;

    @Column(unique = true)
    private String inviteToken;

    private LocalDateTime invitedAt;
    private LocalDateTime respondedAt;
    private LocalDateTime joinedAt;

    private Boolean isOrganizer = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Attendee() {
        this.invitedAt = LocalDateTime.now();
    }

    public Attendee(Meeting meeting, User user) {
        this();
        this.meeting = meeting;
        this.user = user;
        this.inviteEmail = user.getEmail();
    }

    public Attendee(Meeting meeting, String email) {
        this();
        this.meeting = meeting;
        this.inviteEmail = email;
    }
}
