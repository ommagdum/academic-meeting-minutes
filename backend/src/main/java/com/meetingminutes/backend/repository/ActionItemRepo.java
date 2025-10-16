package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ActionItemRepo extends JpaRepository<ActionItem, UUID> {

    List<ActionItem> findByMeetingId(UUID meetingId);

    List<ActionItem> findByMeetingIdOrderByCreatedAtAsc(UUID meetingId);

    @Query("SELECT ai FROM ActionItem ai WHERE ai.assignedToUser.id = :userId ORDER BY ai.deadline ASC")
    List<ActionItem> findByAssignedToUserOrderByDeadlineAsc(@Param("userId") UUID userId);

    @Query("SELECT ai FROM ActionItem ai WHERE ai.assignedToUser.id = :userId AND ai.status != :status ORDER BY ai.deadline ASC")
    List<ActionItem> findByAssignedToUserAndStatusNotOrderByDeadlineAsc(
            @Param("userId") UUID userId,
            @Param("status")TaskStatus status
            );

    @Query("SELECT ai FROM ActionItem ai WHERE ai.assignedToUser.id = :userId AND ai.status = :status")
    List<ActionItem> findByAssignedToUserAndStatus(@Param("userId") UUID userId, @Param("status") TaskStatus status);

    @Query("SELECT COUNT(ai) FROM ActionItem ai WHERE ai.assignedToUser.id = :userId AND ai.status = :status")
    long countByAssignedToUserAndStatus(@Param("userId") UUID userId, @Param("status") TaskStatus status);

    @Query("SELECT ai FROM ActionItem ai WHERE ai.deadline < :currentDate AND ai.status NOT IN ('COMPLETED', 'CANCELLED')")
    List<ActionItem> findOverdueActionItems(@Param("currentDate")LocalDateTime currentDate);

    @Query("SELECT ai FROM ActionItem ai WHERE ai.assignedToUser.id = :userId AND ai.acknowledged = false")
    List<ActionItem> findUnacknowledgedActionItemsByUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(ai) FROM ActionItem ai WHERE ai.meeting.id = :meetingId")
    long countByMeetingId(@Param("meetingId") UUID meetingId);

    void deleteByMeetingId(UUID meetingId);
}
