// Update: src/main/java/com/meetingminutes/backend/controller/MeetingSeriesController.java
package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.MeetingSeriesResponse;
import com.meetingminutes.backend.dto.MeetingSummaryResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.MeetingSeriesService;
import com.meetingminutes.backend.service.UserService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/meeting-series")
@RequiredArgsConstructor
public class MeetingSeriesController {

    private final MeetingSeriesService meetingSeriesService;
    private final UserService userService;

    /**
     * Create a new meeting series
     */
    @PostMapping
    public ResponseEntity<MeetingSeriesResponse> createMeetingSeries(
            @RequestBody CreateSeriesRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);

        var series = meetingSeriesService.createSeries(request.getTitle(), request.getDescription(), user);
        var response = MeetingSeriesResponse.from(series);

        return ResponseEntity.status(201).body(response);
    }

    /**
     * Get all meeting series for the current user
     */
    @GetMapping
    public ResponseEntity<List<MeetingSeriesResponse>> getUserSeries(
            @RequestParam(defaultValue = "3") int recentMeetings,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.debug("Fetching meeting series for user: {} with {} recent meetings",
                user.getEmail(), recentMeetings);

        List<MeetingSeriesResponse> series = meetingSeriesService
                .getUserSeriesWithRecentMeetings(user, recentMeetings);

        return ResponseEntity.ok(series);
    }

    /**
     * Get meetings in a specific series
     */
    @GetMapping("/{seriesId}/meetings")
    public ResponseEntity<List<MeetingSummaryResponse>> getSeriesMeetings(
            @PathVariable UUID seriesId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);

        var meetings = meetingSeriesService.getMeetingsInSeries(seriesId, user);
        var responses = meetings.stream()
                .map(MeetingSummaryResponse::from)
                .toList();

        return ResponseEntity.ok(responses);
    }

    /**
     * Update a meeting series
     */
    @PutMapping("/{seriesId}")
    public ResponseEntity<MeetingSeriesResponse> updateSeries(
            @PathVariable UUID seriesId,
            @RequestBody UpdateSeriesRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);

        var series = meetingSeriesService.updateSeries(seriesId, request.getTitle(), request.getDescription(), user);
        var response = MeetingSeriesResponse.from(series);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a meeting series
     */
    @DeleteMapping("/{seriesId}")
    public ResponseEntity<Void> deleteSeries(
            @PathVariable UUID seriesId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);

        meetingSeriesService.deleteSeries(seriesId, user);
        return ResponseEntity.noContent().build();
    }

    @Getter
    @Setter
    public static class CreateSeriesRequest {
        private String title;
        private String description;
    }

    @Getter
    @Setter
    public static class UpdateSeriesRequest {
        private String title;
        private String description;
    }
}