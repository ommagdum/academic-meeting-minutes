package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "meetings")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Meeting extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @ManyToOne
    @JoinColumn(name = "series_id")
    private MeetingSeries series;

    @Enumerated(EnumType.STRING)
    private MeetingStatus status = MeetingStatus.DRAFT;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "agenda_text", columnDefinition = "TEXT")
    private String agendaText;

    private Boolean usePreviousContext = false;

    private LocalDateTime scheduledTime;

    private LocalDateTime actualStartTime;

    private LocalDateTime actualEndTime;
}
