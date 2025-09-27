package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    Page<Meeting> findByCreatedByOrderByCreatedAtDesc(User user, Pageable pageable);
    List<Meeting> findBySeriesIdOrderByCreatedAtDesc(UUID seriesId);
    Optional<Meeting> findByIdAndCreatedBy(UUID id, User createdBy);

    @Query("SELECT m FROM Meeting m WHERE m.series.id = :seriesId AND m.status = 'PROCESSED' ORDER BY m.createdAt DESC")
    List<Meeting> findProcessedMeetingsInSeries(@Param("seriesId") UUID seriesId);
}
