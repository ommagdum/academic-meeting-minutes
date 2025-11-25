package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.SearchRequest;
import com.meetingminutes.backend.dto.SearchResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.MeetingSearchService;
import com.meetingminutes.backend.service.UserService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {

    private final MeetingSearchService meetingSearchService;
    private final UserService userService;

    @PostMapping("/meetings")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<SearchResponse> searchMeetings(
            @Valid @RequestBody SearchRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Search meetings request from user: {}", email);

        try {
            User user = userService.findByEmail(email);
            SearchResponse response = meetingSearchService.searchMeetings(request, user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Search failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/meetings/quick")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<SearchResponse> quickSearch(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Quick search request from user: {} - query: {}", email, q);

        try {
            User user = userService.findByEmail(email);

            SearchRequest request = new SearchRequest();
            request.setQuery(q);
            request.setPage(page);
            request.setSize(size);

            SearchResponse response = meetingSearchService.searchMeetings(request, user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Quick search failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/meetings/category/{category}")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<SearchResponse> searchByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Category search request from user: {} - category: {}", email, category);

        try {
            User user = userService.findByEmail(email);

            SearchRequest request = new SearchRequest();
            request.setCategory(category);
            request.setPage(page);
            request.setSize(size);

            SearchResponse response = meetingSearchService.searchMeetings(request, user);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Category search failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/transcripts")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<SearchResponse> searchTranscripts(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Transcript search request from user: {} - query: {}", email, q);

        try {
            User user = userService.findByEmail(email);
            SearchResponse response = meetingSearchService.searchTranscripts(q, user, page, size);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Transcript search failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/analytics/meetings")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<Map<String, Long>> getMeetingAnalytics(
            @RequestParam String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Meeting analytics request from user: {} - period: {}", email, period);

        try {
            User user = userService.findByEmail(email);
            Map<String, Long> analytics = meetingSearchService.getMeetingAnalytics(user, period, startDate, endDate);
            return ResponseEntity.ok(analytics);
        } catch (Exception e) {
            log.error("Meeting analytics failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/facets")
    @RateLimiter(name = "searchEndpoints")
    public ResponseEntity<Map<String, Object>> getSearchFacets(Authentication authentication) {
        String email = authentication.getName();
        log.info("Search facets request from user: {}", email);

        try {
            User user = userService.findByEmail(email);

            // Get facets for all user's meetings
            SearchRequest request = new SearchRequest();
            request.setPage(0);
            request.setSize(1); // We only need facets, not results

            SearchResponse response = meetingSearchService.searchMeetings(request, user);
            return ResponseEntity.ok(response.getFacets());
        } catch (Exception e) {
            log.error("Search facets failed for user: {}", email, e);
            return ResponseEntity.badRequest().build();
        }
    }
}