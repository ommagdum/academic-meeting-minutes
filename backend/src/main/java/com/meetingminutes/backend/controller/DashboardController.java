package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.MeetingSummaryResponse;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.service.MeetingSearchService;
import com.meetingminutes.backend.service.UserService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final MeetingRepository meetingRepository;
    private final UserService userService;
    private final MeetingSearchService meetingSearchService;

    @GetMapping("/stats")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<Map<String, Object>> getDashboardStats(Authentication authentication) {
        String email = authentication.getName();
        log.info("Dashboard stats request from user: {}", email);

        try {
            User user = userService.findByEmail(email);
            Map<String, Object> stats = buildDashboardStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Dashboard stats failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/recent-activity")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<List<MeetingSummaryResponse>> getRecentActivity(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Recent activity request from user: {} - limit: {}", email, limit);

        try {
            User user = userService.findByEmail(email);
            Pageable pageable = PageRequest.of(0, limit, Sort.by("createdAt").descending());

            // ✅ FIXED: Use the new method that includes attended meetings
            Page<Meeting> recentMeetings = meetingRepository.findByUserOrAttendee(user, pageable);

            List<MeetingSummaryResponse> responses = recentMeetings.getContent().stream()
                    .map(this::convertToSummaryResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Recent activity failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/upcoming-meetings")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<List<MeetingSummaryResponse>> getUpcomingMeetings(
            @RequestParam(defaultValue = "5") int limit,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Upcoming meetings request from user: {} - limit: {}", email, limit);

        try {
            User user = userService.findByEmail(email);
            Pageable pageable = PageRequest.of(0, limit, Sort.by("scheduledTime").ascending());

            // ✅ FIXED: Use the new method that includes attended meetings
            Page<Meeting> upcomingMeetings = meetingRepository.findByUserOrAttendeeAndScheduledTimeAfter(
                    user, LocalDateTime.now(), pageable);

            List<MeetingSummaryResponse> responses = upcomingMeetings.getContent().stream()
                    .map(this::convertToSummaryResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Upcoming meetings failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/processing-queue")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<List<MeetingSummaryResponse>> getProcessingQueue(
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Processing queue request from user: {}", email);

        try {
            User user = userService.findByEmail(email);

            // ✅ FIXED: Use the new method that includes attended meetings
            List<Meeting> processingMeetings = meetingRepository.findByUserOrAttendeeAndStatus(
                    user, MeetingStatus.PROCESSING);

            List<MeetingSummaryResponse> responses = processingMeetings.stream()
                    .map(this::convertToSummaryResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            log.error("Processing queue failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    private Map<String, Object> buildDashboardStats(User user) {
        Map<String, Object> stats = new HashMap<>();

        // ✅ FIXED: Use new methods that include attended meetings
        long totalMeetings = meetingRepository.countByUserOrAttendee(user);
        long processedMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSED);
        long draftMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.DRAFT);
        long processingMeetings = meetingRepository.countByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSING);

        stats.put("totalMeetings", totalMeetings);
        stats.put("processedMeetings", processedMeetings);
        stats.put("draftMeetings", draftMeetings);
        stats.put("processingMeetings", processingMeetings);

        // Meetings this week - ✅ FIXED: Use new method
        LocalDateTime startOfWeek = LocalDateTime.now().with(java.time.DayOfWeek.MONDAY).toLocalDate().atStartOfDay();
        LocalDateTime endOfWeek = startOfWeek.plusDays(7);

        long meetingsThisWeek = meetingRepository.countByUserOrAttendeeAndCreatedAtBetween(
                user, startOfWeek, endOfWeek);
        stats.put("meetingsThisWeek", meetingsThisWeek);

        // Processing performance
        long totalProcessableMeetings = processedMeetings + processingMeetings;
        if (totalProcessableMeetings > 0) {
            double successRate = (double) processedMeetings / totalProcessableMeetings * 100;
            stats.put("processingSuccessRate", Math.round(successRate * 100.0) / 100.0);
        } else {
            stats.put("processingSuccessRate", 0.0);
        }

        // Upcoming meetings - ✅ FIXED: Use new method
        long upcomingCount = meetingRepository.countByUserOrAttendeeAndScheduledTimeAfter(
                user, LocalDateTime.now());
        stats.put("upcomingMeetings", upcomingCount);

        // Monthly trend - ✅ FIXED: Use new method
        LocalDateTime monthAgo = LocalDateTime.now().minusMonths(1);
        List<Meeting> monthlyMeetings = meetingRepository.findByUserOrAttendeeAndCreatedAtAfter(
                user, monthAgo);

        Map<String, Long> monthlyTrend = monthlyMeetings.stream()
                .collect(Collectors.groupingBy(
                        meeting -> {
                            LocalDateTime date = meeting.getCreatedAt();
                            return date != null ?
                                    date.toLocalDate().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE) :
                                    "unknown";
                        },
                        Collectors.counting()
                ));
        stats.put("monthlyTrend", monthlyTrend);

        // ✅ NEW: Add user role context
        stats.put("userRole", user.getRole().name());
        stats.put("userEmail", user.getEmail());

        return stats;
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
                .attendeeCount(meeting.getAttendees() != null ? meeting.getAttendees().size() : 0)
                .agendaItemCount(meeting.getAgendaItems() != null ? meeting.getAgendaItems().size() : 0)
                .actionItemCount(meeting.getActionItems() != null ? meeting.getActionItems().size() : 0)
                .seriesId(meeting.getSeries() != null ? meeting.getSeries().getId() : null)
                .seriesTitle(meeting.getSeries() != null ? meeting.getSeries().getTitle() : null)
                .createdBy(com.meetingminutes.backend.dto.UserResponse.from(meeting.getCreatedBy()))
                .build();
    }
}