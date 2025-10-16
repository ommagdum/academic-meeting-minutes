package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    Page<Meeting> findByCreatedByOrderByCreatedAtDesc(User user, Pageable pageable);
    List<Meeting> findBySeriesIdOrderByCreatedAtDesc(UUID seriesId);
    Optional<Meeting> findByIdAndCreatedBy(UUID id, User createdBy);

    @Query("SELECT m FROM Meeting m WHERE m.series.id = :seriesId AND m.status = 'PROCESSED' ORDER BY m.createdAt DESC")
    List<Meeting> findProcessedMeetingsInSeries(@Param("seriesId") UUID seriesId);

    @Query("SELECT m FROM Meeting m WHERE m.createdBy = :user OR m.id IN (SELECT a.meeting.id FROM Attendee a WHERE a.user = :user) ORDER BY m.createdAt DESC")
    Page<Meeting> findByCreatedByOrAttendeesUser(@Param("user") User user, Pageable pageable);

    List<Meeting> findByStatus(MeetingStatus status);

    List<Meeting> findByCreatedByAndStatus(User user, MeetingStatus status);

    @Query("SELECT m FROM Meeting m WHERE m.scheduledTime BETWEEN :start AND :end")
    List<Meeting> findMeetingsBetweenDates(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(m) FROM Meeting m WHERE m.createdBy = :user AND m.status = :status")
    long countByCreatedByAndStatus(@Param("user") User user, @Param("status") MeetingStatus status);

    @Query("SELECT m FROM Meeting m WHERE m.actualStartTime IS NOT NULL AND m.actualEndTime IS NULL")
    List<Meeting> findActiveMeetings();

    @Query("SELECT m FROM Meeting m WHERE m.usePreviousContext = true AND m.series.id IS NOT NULL ORDER BY m.createdAt DESC")
    List<Meeting> findMeetingsWithContextEnabled();

    @Query(value = "SELECT * FROM meetings m WHERE m.created_by = :userId AND m.status = 'PROCESSED' ORDER BY m.created_at DESC LIMIT :limit", nativeQuery = true)
    List<Meeting> findRecentProcessedMeetingsByUser(@Param("userId") UUID userId, @Param("limit") int limit);
}
