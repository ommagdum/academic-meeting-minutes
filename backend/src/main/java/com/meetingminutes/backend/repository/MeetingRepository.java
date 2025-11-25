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

    // EXISTING METHODS (keep these)
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

    // NEW METHODS FOR SEARCH FUNCTIONALITY
    Page<Meeting> findByCreatedBy(User user, Pageable pageable);
    Page<Meeting> findByCreatedByAndStatus(User user, MeetingStatus status, Pageable pageable);
    Page<Meeting> findByCreatedByAndStatusIn(User user, List<MeetingStatus> statuses, Pageable pageable);
    Page<Meeting> findByCreatedByAndSeriesId(User user, UUID seriesId, Pageable pageable);
    Page<Meeting> findByCreatedByAndScheduledTimeBetween(User user, LocalDateTime start, LocalDateTime end, Pageable pageable);
    Page<Meeting> findByCreatedByAndScheduledTimeAfter(User user, LocalDateTime date, Pageable pageable);
    Page<Meeting> findByCreatedByAndIdIn(User user, List<UUID> meetingIds, Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE m.createdBy = :user AND SIZE(m.actionItems) > 0")
    Page<Meeting> findByCreatedByAndActionItemsIsNotEmpty(@Param("user") User user, Pageable pageable);

    // Full-text search methods
    @Query("SELECT m FROM Meeting m WHERE m.createdBy = :user AND " +
            "(LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(m.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(m.agendaText) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Meeting> fullTextSearch(@Param("user") User user, @Param("query") String query, Pageable pageable);

    @Query(value = "SELECT m.*, ts_rank_cd(to_tsvector('english', " +
            "COALESCE(m.title, '') || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.agenda_text, '')), " +
            "plainto_tsquery('english', :query)) as rank " +
            "FROM meetings m " +
            "WHERE m.created_by = :userId " +
            "AND to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.agenda_text, '')) " +
            "@@ plainto_tsquery('english', :query) " +
            "ORDER BY rank DESC, m.created_at DESC",  // Only this sorting
            countQuery = "SELECT COUNT(*) FROM meetings m WHERE m.created_by = :userId " +
                    "AND to_tsvector('english', COALESCE(m.title, '') || ' ' || COALESCE(m.description, '') || ' ' || COALESCE(m.agenda_text, '')) " +
                    "@@ plainto_tsquery('english', :query)",
            nativeQuery = true)
    Page<Meeting> fullTextSearchWithRanking(@Param("userId") UUID userId,
                                            @Param("query") String query,
                                            Pageable pageable);

    Page<Meeting> findByCreatedByAndCreatedAtBetween(User user, LocalDateTime start, LocalDateTime end, Pageable pageable);
    Page<Meeting> findByCreatedByAndCreatedAtAfter(User user, LocalDateTime date, Pageable pageable);

    // Get meetings where user is creator OR attendee
    @Query("SELECT m FROM Meeting m WHERE m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)")
    Page<Meeting> findByUserOrAttendee(@Param("user") User user, Pageable pageable);

    // Count meetings where user is creator OR attendee
    @Query("SELECT COUNT(m) FROM Meeting m WHERE m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)")
    long countByUserOrAttendee(@Param("user") User user);

    // Get upcoming meetings where user is creator OR attendee
    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.scheduledTime > :scheduledTime")
    Page<Meeting> findByUserOrAttendeeAndScheduledTimeAfter(
            @Param("user") User user,
            @Param("scheduledTime") LocalDateTime scheduledTime,
            Pageable pageable);

    // Count upcoming meetings where user is creator OR attendee
    @Query("SELECT COUNT(m) FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.scheduledTime > :scheduledTime")
    long countByUserOrAttendeeAndScheduledTimeAfter(
            @Param("user") User user,
            @Param("scheduledTime") LocalDateTime scheduledTime);

    // Get meetings by status where user is creator OR attendee
    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.status = :status")
    Page<Meeting> findByUserOrAttendeeAndStatus(
            @Param("user") User user,
            @Param("status") MeetingStatus status,
            Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.status = :status")
    List<Meeting> findByUserOrAttendeeAndStatus(
            @Param("user") User user,
            @Param("status") MeetingStatus status);

    // Count meetings by status where user is creator OR attendee
    @Query("SELECT COUNT(m) FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.status = :status")
    long countByUserOrAttendeeAndStatus(
            @Param("user") User user,
            @Param("status") MeetingStatus status);

    // Get meetings within date range where user is creator OR attendee
    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.createdAt BETWEEN :start AND :end")
    Page<Meeting> findByUserOrAttendeeAndCreatedAtBetween(
            @Param("user") User user,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);

    // Count meetings within date range where user is creator OR attendee
    @Query("SELECT COUNT(m) FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.createdAt BETWEEN :start AND :end")
    long countByUserOrAttendeeAndCreatedAtBetween(
            @Param("user") User user,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Get meetings after date where user is creator OR attendee
    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.createdAt > :date")
    List<Meeting> findByUserOrAttendeeAndCreatedAtAfter(
            @Param("user") User user,
            @Param("date") LocalDateTime date);

    // For filtered searches with userOrAttendee
    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.status IN :statuses")
    Page<Meeting> findByUserOrAttendeeAndStatusIn(
            @Param("user") User user,
            @Param("statuses") List<MeetingStatus> statuses,
            Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.series.id = :seriesId")
    Page<Meeting> findByUserOrAttendeeAndSeriesId(
            @Param("user") User user,
            @Param("seriesId") UUID seriesId,
            Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.scheduledTime BETWEEN :start AND :end")
    Page<Meeting> findByUserOrAttendeeAndScheduledTimeBetween(
            @Param("user") User user,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.actionItems IS NOT EMPTY")
    Page<Meeting> findByUserOrAttendeeAndActionItemsIsNotEmpty(
            @Param("user") User user,
            Pageable pageable);

    @Query("SELECT m FROM Meeting m WHERE (m.createdBy = :user OR m.id IN " +
            "(SELECT a.meeting.id FROM Attendee a WHERE a.user = :user)) " +
            "AND m.id IN :meetingIds")
    Page<Meeting> findByUserOrAttendeeAndIdIn(
            @Param("user") User user,
            @Param("meetingIds") List<UUID> meetingIds,
            Pageable pageable);

    // Full-text search for userOrAttendee
    @Query(value = "SELECT m.*, ts_rank_cd(m.search_vector, plainto_tsquery('english', :query)) as rank " +
            "FROM meetings m " +
            "WHERE (m.created_by = :userId OR m.id IN " +
            "(SELECT a.meeting_id FROM attendees a WHERE a.user_id = :userId)) " +
            "AND m.search_vector @@ plainto_tsquery('english', :query) " +
            "ORDER BY rank DESC, m.created_at DESC",
            countQuery = "SELECT COUNT(*) FROM meetings m " +
                    "WHERE (m.created_by = :userId OR m.id IN " +
                    "(SELECT a.meeting_id FROM attendees a WHERE a.user_id = :userId)) " +
                    "AND m.search_vector @@ plainto_tsquery('english', :query)",
            nativeQuery = true)
    Page<Meeting> fullTextSearchWithRankingForUserOrAttendee(
            @Param("userId") UUID userId,
            @Param("query") String query,
            Pageable pageable);
}