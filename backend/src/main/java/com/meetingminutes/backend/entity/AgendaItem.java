package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "agenda_items")
@Getter
@Setter
@NoArgsConstructor
public class AgendaItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer orderIndex;

    private Integer estimatedDuration; // in minutes

    @Column(columnDefinition = "TEXT")
    private String discussionSummary;

    private Boolean completed = false;

    public AgendaItem(Meeting meeting, String title, Integer orderIndex) {
        this.meeting = meeting;
        this.title = title;
        this.orderIndex = orderIndex;
    }
}
