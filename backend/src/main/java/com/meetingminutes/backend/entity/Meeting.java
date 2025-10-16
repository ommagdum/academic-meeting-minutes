package com.meetingminutes.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "meetings")
@Getter
@Setter
@NoArgsConstructor
public class Meeting extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "series_id")
    private MeetingSeries series;

    @Enumerated(EnumType.STRING)
    private MeetingStatus status = MeetingStatus.DRAFT;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "agenda_text", columnDefinition = "TEXT")
    private String agendaText;

    private Boolean usePreviousContext = false;

    private LocalDateTime scheduledTime;

    private LocalDateTime actualStartTime;

    private LocalDateTime actualEndTime;

    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AgendaItem> agendaItems;

    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Attendee> attendees;

    @OneToMany(mappedBy = "meeting", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ActionItem> actionItems;

    @Column(name = "audio_file_path")
    private String audioFilePath;

    public Meeting(String title, User createdBy) {
        this.title = title;
        this.createdBy = createdBy;
    }
}
