package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.AttendanceStatus;
import com.meetingminutes.backend.entity.Attendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendeeRepo extends JpaRepository<Attendee, UUID> {

    List<Attendee> findByMeetingId(UUID meetingId);

    List<Attendee> findByUserId(UUID userId);

    List<Attendee> findByUserIdAndStatus(UUID userId, AttendanceStatus status);

    Optional<Attendee> findByMeetingIdAndUserId(UUID meetingId, UUID userId);

    Optional<Attendee> findByInviteToken(String inviteToken);

    @Query("SELECT a FROM Attendee a WHERE a.meeting.id = :meetingId AND a.inviteEmail = :email")
    Optional<Attendee> findByMeetingIdAndEmail(@Param("meetingId") UUID meetingId, @Param("email") String email);

    boolean existsByMeetingIdAndUserId(UUID meetingId, UUID userId);

    boolean existsByMeetingIdAndInviteEmail(UUID meetingId, String inviteEmail);

    @Query("SELECT COUNT(a) FROM Attendee a WHERE a.meeting.id = :meetingId AND a.status = :status")
    Long countByMeetingIdAndStatus(@Param("meetingId") UUID meetingId, @Param("status") AttendanceStatus status);

    @Query("SELECT a FROM Attendee a WHERE a.meeting.id = :meetingId AND a.isOrganizer = true")
    Optional<Attendee> findOrganizerByMeetingId(@Param("meetingId") UUID meetingId);

    void deleteByMeetingId(UUID meetingId);

    List<Attendee> findByInviteEmailAndUserIsNull(String inviteEmail);
}
