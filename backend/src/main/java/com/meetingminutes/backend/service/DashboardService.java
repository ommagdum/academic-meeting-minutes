package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.MeetingSummaryResponse;
import com.meetingminutes.backend.dto.UserResponse;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DashboardService {

    private final MeetingRepository meetingRepository;

    @Cacheable(value = "analytics", key = "#user.email + '_stats'")
    public Map<String, Object> getDashboardStats(User user) {
        log.info("Computing dashboard stats for user: {}", user.getEmail());
        Map<String, Object> stats = new HashMap<>();

        long totalMeetings = meetingRepository.countByUserOrAttendee(user);
        long processedMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSED);
        long draftMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.DRAFT);
        long processingMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSING);

        stats.put("totalMeetings", totalMeetings);
        stats.put("processedMeetings", processedMeetings);
        stats.put("draftMeetings", draftMeetings);
        stats.put("processingMeetings", processingMeetings);

        LocalDateTime startOfWeek = LocalDateTime.now().with(java.time.DayOfWeek.MONDAY).toLocalDate().atStartOfDay();
        LocalDateTime endOfWeek = startOfWeek.plusDays(7);
        long meetingsThisWeek = meetingRepository.countByUserOrAttendeeAndCreatedAtBetween(user, startOfWeek, endOfWeek);
        stats.put("meetingsThisWeek", meetingsThisWeek);

        long totalProcessableMeetings = processedMeetings + processingMeetings;
        if (totalProcessableMeetings > 0) {
            double successRate = (double) processedMeetings / totalProcessableMeetings * 100;
            stats.put("processingSuccessRate", Math.round(successRate * 100.0) / 100.0);
        } else {
            stats.put("processingSuccessRate", 0.0);
        }

        long upcomingCount = meetingRepository.countByUserOrAttendeeAndScheduledTimeAfter(user, LocalDateTime.now());
        stats.put("upcomingMeetings", upcomingCount);

        LocalDateTime monthAgo = LocalDateTime.now().minusMonths(1);
        List<Meeting> monthlyMeetings = meetingRepository.findByUserOrAttendeeAndCreatedAtAfter(user, monthAgo);
        Map<String, Long> monthlyTrend = monthlyMeetings.stream()
                .collect(Collectors.groupingBy(
                        meeting -> {
                            LocalDateTime date = meeting.getCreatedAt();
                            return date != null ?
                                    date.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE) : "unknown";
                        },
                        Collectors.counting()
                ));
        stats.put("monthlyTrend", monthlyTrend);
        stats.put("userRole", user.getRole().name());
        stats.put("userEmail", user.getEmail());

        return stats;
    }

    @Cacheable(value = "meetings", key = "#user.email + '_recent_' + #limit")
    public List<MeetingSummaryResponse> getRecentActivity(User user, int limit) {
        log.info("Computing recent activity for user: {} - limit: {}", user.getEmail(), limit);
        Pageable pageable = PageRequest.of(0, limit, Sort.by("createdAt").descending());
        Page<Meeting> recentMeetings = meetingRepository.findByUserOrAttendee(user, pageable);
        return recentMeetings.getContent().stream()
                .map(this::convertToSummaryResponse)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "meetings", key = "#user.email + '_upcoming_' + #limit")
    public List<MeetingSummaryResponse> getUpcomingMeetings(User user, int limit) {
        log.info("Computing upcoming meetings for user: {} - limit: {}", user.getEmail(), limit);
        Pageable pageable = PageRequest.of(0, limit, Sort.by("scheduledTime").ascending());
        Page<Meeting> upcomingMeetings = meetingRepository.findByUserOrAttendeeAndScheduledTimeAfter(
                user, LocalDateTime.now(), pageable);
        return upcomingMeetings.getContent().stream()
                .map(this::convertToSummaryResponse)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "meetings", key = "#user.email + '_processing'")
    public List<MeetingSummaryResponse> getProcessingQueue(User user) {
        log.info("Computing processing queue for user: {}", user.getEmail());
        List<Meeting> processingMeetings = meetingRepository.findByUserOrAttendeeAndStatus(
                user, MeetingStatus.PROCESSING);
        return processingMeetings.stream()
                .map(this::convertToSummaryResponse)
                .collect(Collectors.toList());
    }

    private MeetingSummaryResponse convertToSummaryResponse(Meeting meeting) {
        return MeetingSummaryResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus())
                .scheduledTime(meeting.getScheduledTime())
                .actualStartTime(meeting.getActualStartTime())
                .actualEndTime(meeting.getActualEndTime())
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .seriesId(meeting.getSeries() != null ? meeting.getSeries().getId() : null)
                .seriesTitle(meeting.getSeries() != null ? meeting.getSeries().getTitle() : null)
                .createdBy(UserResponse.from(meeting.getCreatedBy()))
                .attendeeCount(0)
                .agendaItemCount(0)
                .actionItemCount(0)
                .build();
    }
}
