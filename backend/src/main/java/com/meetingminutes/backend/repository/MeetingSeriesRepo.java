package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.MeetingSeries;
import com.meetingminutes.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingSeriesRepo extends JpaRepository<MeetingSeries, UUID> {

    List<MeetingSeries> findByCreatedBy(User user);

    List<MeetingSeries> findByCreatedByAndIsActive(User user, Boolean isActive);

    @Query("SELECT ms FROM MeetingSeries ms WHERE ms.isActive = true ORDER BY ms.createdAt DESC")
    List<MeetingSeries> findActiveSeries();

    @Query("SELECT COUNT(ms) FROM MeetingSeries ms WHERE ms.createdBy =:user AND ms.isActive = true")
    long countActiveSeriesByUser(@Param("user") User user);

    @Query("SELECT ms FROM MeetingSeries ms WHERE LOWER(ms.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<MeetingSeries> findByTitleContaining(@Param("keyword") String keyword);

    List<MeetingSeries> findByCreatedByOrderByCreatedAtDesc(User createdBy);

    Optional<MeetingSeries> findByIdAndCreatedBy(UUID id, User createdBy);

    @Query("SELECT ms FROM MeetingSeries ms WHERE ms.createdBy = :user AND ms.isActive = true")
    List<MeetingSeries> findActiveSeriesByUser(@Param("user") User user);

    boolean existsByTitleAndCreatedBy(String title, User createdBy);

    @Query("SELECT DISTINCT ms FROM MeetingSeries ms " +
            "WHERE ms.createdBy = :user " +
            "OR ms.id IN (SELECT m.series.id FROM Meeting m " +
            "JOIN m.attendees a WHERE a.user = :user AND m.series IS NOT NULL)")
    List<MeetingSeries> findByCreatedByOrAttendeeOrderByCreatedAtDesc(@Param("user") User user);
}
