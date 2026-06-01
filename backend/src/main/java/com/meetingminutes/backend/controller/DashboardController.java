package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.MeetingSummaryResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.DashboardService;
import com.meetingminutes.backend.service.UserService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    @GetMapping("/stats")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<Map<String, Object>> getDashboardStats(Authentication authentication) {
        String email = authentication.getName();
        log.info("Dashboard stats request from user: {}", email);
        try {
            User user = userService.findByEmail(email);
            return ResponseEntity.ok(dashboardService.getDashboardStats(user));
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
            return ResponseEntity.ok(dashboardService.getRecentActivity(user, limit));
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
            return ResponseEntity.ok(dashboardService.getUpcomingMeetings(user, limit));
        } catch (Exception e) {
            log.error("Upcoming meetings failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/processing-queue")
    @RateLimiter(name = "dashboardEndpoints")
    public ResponseEntity<List<MeetingSummaryResponse>> getProcessingQueue(Authentication authentication) {
        String email = authentication.getName();
        log.info("Processing queue request from user: {}", email);
        try {
            User user = userService.findByEmail(email);
            return ResponseEntity.ok(dashboardService.getProcessingQueue(user));
        } catch (Exception e) {
            log.error("Processing queue failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }
}