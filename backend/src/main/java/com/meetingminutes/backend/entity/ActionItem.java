package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "action_items")
@NoArgsConstructor
public class ActionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private User assignedToUser;

    private String assignedToEmail; // for external assignees

    private LocalDateTime deadline;

    @Enumerated(EnumType.STRING)
    private TaskStatus status = TaskStatus.PENDING;

    private Integer priority = 1; // 1=Low, 2=Medium, 3=High

    private Boolean acknowledged = false;
    private LocalDateTime acknowledgedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime completedAt;

    @Column(columnDefinition = "TEXT")
    private String completionNotes;

    public ActionItem(Meeting meeting, String description) {
        this.meeting = meeting;
        this.description = description;
    }

}
