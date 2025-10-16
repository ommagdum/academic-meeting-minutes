package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.AgendaItem;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgendaItemRepo extends JpaRepository<AgendaItem, UUID> {
    List<AgendaItem> findByMeetingIdOrderByOrderIndexAsc(UUID meetingId);

    @Query("SELECT ai FROM AgendaItem ai WHERE ai.meeting.id = :meetingId AND ai.completed = true")
    List<AgendaItem> findCompletedAgendaItemsByMeetingId(@Param("meetingId") UUID meetingId);

    @Query("SELECT COUNT(ai) FROM AgendaItem ai WHERE ai.meeting.id = :meetingId AND ai.completed = true")
    Long countCompletedAgendaItemsByMeetingId(@Param("meetingId") UUID meetingId);

    void deleteByMeetingId(UUID meetingId);

    @Query("SELECT ai FROM AgendaItem ai WHERE ai.meeting.id = :meetingId AND ai.orderIndex = :orderIndex")
    Optional<AgendaItem> findByMeetingIdAndOrderIndex(@Param("meetingId") UUID meetingId, @Param("orderIndex") Integer orderIndex);
}
