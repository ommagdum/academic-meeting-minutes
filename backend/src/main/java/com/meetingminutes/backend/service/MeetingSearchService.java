package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.SearchRequest;
import com.meetingminutes.backend.dto.SearchResponse;
import com.meetingminutes.backend.dto.MeetingSearchResult;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.TextCriteria;
import org.springframework.data.mongodb.core.query.TextQuery;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.Year;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingSearchService {

    private final MeetingRepository meetingRepository;
    private final TranscriptRepository transcriptRepository;
    private final MongoTemplate mongoTemplate;

    public SearchResponse searchMeetings(SearchRequest request, User user) {
        log.info("Executing comprehensive search for user: {} with filters: {}", user.getEmail(), request);

        request.validateDateRange();

        Pageable pageable = createPageable(request);

        // ✅ FIXED: Use the new method that includes attended meetings
        Page<Meeting> meetingsPage = executeAdvancedSearch(request, user, pageable);

        return buildSearchResponse(meetingsPage, request, user);
    }

    private Pageable createPageable(SearchRequest request) {
        Sort sort = createSort(request);
        return PageRequest.of(request.getPage(), request.getSize(), sort);
    }

    private Sort createSort(SearchRequest request) {
        if ("relevance".equals(request.getSortBy()) && request.getQuery() != null) {
            return Sort.by(Sort.Direction.DESC, "createdAt"); // Relevance handled by full-text search
        }

        Sort.Direction direction = "desc".equalsIgnoreCase(request.getSortDirection())
                ? Sort.Direction.DESC : Sort.Direction.ASC;

        String sortField = switch (request.getSortBy()) {
            case "title" -> "title";
            case "scheduledTime" -> "scheduledTime";
            case "status" -> "status";
            default -> "createdAt";
        };

        return Sort.by(direction, sortField);
    }

    private Page<Meeting> executeCategorySearch(String category, User user, Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();
        Year currentYear = Year.now();

        return switch (category.toLowerCase()) {
            // ✅ FIXED: All methods now use userOrAttendee instead of just createdBy
            case "recent" -> meetingRepository.findByUserOrAttendee(user, pageable);
            case "upcoming" -> meetingRepository.findByUserOrAttendeeAndScheduledTimeAfter(user, now, pageable);
            case "processed" -> meetingRepository.findByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSED, pageable);
            case "draft" -> meetingRepository.findByUserOrAttendeeAndStatus(user, MeetingStatus.DRAFT, pageable);
            case "processing" -> meetingRepository.findByUserOrAttendeeAndStatus(user, MeetingStatus.PROCESSING, pageable);
            case "withActions" -> meetingRepository.findByUserOrAttendeeAndActionItemsIsNotEmpty(user, pageable);
            case "withTranscript" -> findMeetingsWithTranscripts(user, pageable);
            case "today" -> findMeetingsForDate(user, today, pageable);
            case "yesterday" -> findMeetingsForDate(user, today.minusDays(1), pageable);
            case "thisWeek" -> findMeetingsForWeek(user, today, pageable);
            case "lastWeek" -> findMeetingsForWeek(user, today.minusWeeks(1), pageable);
            case "thisMonth" -> findMeetingsForMonth(user, currentMonth, pageable);
            case "lastMonth" -> findMeetingsForMonth(user, currentMonth.minusMonths(1), pageable);
            case "thisYear" -> findMeetingsForYear(user, currentYear, pageable);
            case "lastYear" -> findMeetingsForYear(user, currentYear.minusYears(1), pageable);
            case "q1" -> findMeetingsForQuarter(user, currentYear, 1, pageable);
            case "q2" -> findMeetingsForQuarter(user, currentYear, 2, pageable);
            case "q3" -> findMeetingsForQuarter(user, currentYear, 3, pageable);
            case "q4" -> findMeetingsForQuarter(user, currentYear, 4, pageable);
            default -> meetingRepository.findByUserOrAttendee(user, pageable);
        };
    }

    private Page<Meeting> executeFilteredSearch(SearchRequest request, User user, Pageable pageable) {
        // Build query based on available filters
        if (request.getStatuses() != null && !request.getStatuses().isEmpty()) {
            // ✅ FIXED: Use userOrAttendee method
            return meetingRepository.findByUserOrAttendeeAndStatusIn(user, request.getStatuses(), pageable);
        }

        if (request.getSeriesId() != null) {
            // ✅ FIXED: Use userOrAttendee method
            return meetingRepository.findByUserOrAttendeeAndSeriesId(user, request.getSeriesId(), pageable);
        }

        if (request.getFromDate() != null && request.getToDate() != null) {
            // ✅ FIXED: Use userOrAttendee method
            return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(
                    user, request.getFromDate(), request.getToDate(), pageable);
        }

        if (request.getHasActionItems() != null && request.getHasActionItems()) {
            // ✅ FIXED: Use userOrAttendee method
            return meetingRepository.findByUserOrAttendeeAndActionItemsIsNotEmpty(user, pageable);
        }

        if (request.getHasTranscript() != null && request.getHasTranscript()) {
            return findMeetingsWithTranscripts(user, pageable);
        }

        // Default: return all user's meetings (created OR attended)
        // ✅ FIXED: Use userOrAttendee method
        return meetingRepository.findByUserOrAttendee(user, pageable);
    }

    private Page<Meeting> findMeetingsWithTranscripts(User user, Pageable pageable) {
        // ✅ FIXED: Get meetings user created OR is attending
        List<UUID> userMeetingIds = meetingRepository.findByUserOrAttendee(user, Pageable.unpaged())
                .stream()
                .map(Meeting::getId)
                .collect(Collectors.toList());

        if (userMeetingIds.isEmpty()) {
            return Page.empty(pageable);
        }

        // Get meetings that have transcripts
        List<UUID> meetingIdsWithTranscripts = transcriptRepository.findAll()
                .stream()
                .map(transcript -> transcript.getMeetingId())
                .distinct()
                .collect(Collectors.toList());

        // Filter user meetings that have transcripts
        List<UUID> userMeetingsWithTranscripts = userMeetingIds.stream()
                .filter(meetingIdsWithTranscripts::contains)
                .collect(Collectors.toList());

        if (userMeetingsWithTranscripts.isEmpty()) {
            return Page.empty(pageable);
        }

        // ✅ FIXED: Use userOrAttendee method
        return meetingRepository.findByUserOrAttendeeAndIdIn(user, userMeetingsWithTranscripts, pageable);
    }

    private Page<Meeting> executeAdvancedSearch(SearchRequest request, User user, Pageable pageable) {
        // Handle category-based search
        if (request.getCategory() != null && !request.getCategory().trim().isEmpty()) {
            return executeCategorySearch(request.getCategory(), user, pageable);
        }

        // Handle full-text search with filters
        if (request.getQuery() != null && !request.getQuery().trim().isEmpty()) {
            return executeFullTextSearchWithFilters(request, user, pageable);
        }

        // Handle filtered search without text query
        return executeFilteredSearch(request, user, pageable);
    }

    private Page<Meeting> executeFullTextSearchWithFilters(SearchRequest request, User user, Pageable pageable) {
        String query = request.getQuery().trim();

        // Create unsorted pageable to prevent duplicate sorting
        Pageable unsortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());

        // ✅ FIXED: Use the new full-text search that includes attended meetings
        Page<Meeting> results = meetingRepository.fullTextSearchWithRankingForUserOrAttendee(user.getId(), query, unsortedPageable);

        // Apply additional filters if needed
        if (hasAdditionalFilters(request)) {
            results = applyAdditionalFilters(results, request, user);
        }

        return results;
    }

    private boolean hasAdditionalFilters(SearchRequest request) {
        return request.getStatuses() != null || request.getSeriesId() != null ||
                request.getFromDate() != null || request.getToDate() != null ||
                request.getHasActionItems() != null || request.getHasTranscript() != null;
    }

    private Page<Meeting> applyAdditionalFilters(Page<Meeting> initialResults, SearchRequest request, User user) {
        // This is a simplified implementation - in production, build a dynamic query
        // For now, we'll filter the results in memory (suitable for moderate result sets)
        List<Meeting> filtered = initialResults.getContent().stream()
                .filter(meeting -> filterByStatus(meeting, request.getStatuses()))
                .filter(meeting -> filterBySeries(meeting, request.getSeriesId()))
                .filter(meeting -> filterByDateRange(meeting, request.getFromDate(), request.getToDate()))
                .filter(meeting -> filterByActionItems(meeting, request.getHasActionItems()))
                .filter(meeting -> filterByTranscript(meeting, request.getHasTranscript()))
                .collect(Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(
                filtered,
                initialResults.getPageable(),
                filtered.size()
        );
    }

    // Filter methods (no changes needed here)
    private boolean filterByStatus(Meeting meeting, List<MeetingStatus> statuses) {
        return statuses == null || statuses.isEmpty() || statuses.contains(meeting.getStatus());
    }

    private boolean filterBySeries(Meeting meeting, UUID seriesId) {
        return seriesId == null ||
                (meeting.getSeries() != null && meeting.getSeries().getId().equals(seriesId));
    }

    private boolean filterByDateRange(Meeting meeting, LocalDateTime fromDate, LocalDateTime toDate) {
        if (fromDate == null && toDate == null) return true;

        LocalDateTime meetingDate = meeting.getScheduledTime() != null ?
                meeting.getScheduledTime() : meeting.getCreatedAt();

        if (meetingDate == null) return false;

        boolean afterFrom = fromDate == null || !meetingDate.isBefore(fromDate);
        boolean beforeTo = toDate == null || !meetingDate.isAfter(toDate);

        return afterFrom && beforeTo;
    }

    private boolean filterByActionItems(Meeting meeting, Boolean hasActionItems) {
        return hasActionItems == null ||
                (hasActionItems && meeting.getActionItems() != null && !meeting.getActionItems().isEmpty()) ||
                (!hasActionItems && (meeting.getActionItems() == null || meeting.getActionItems().isEmpty()));
    }

    private boolean filterByTranscript(Meeting meeting, Boolean hasTranscript) {
        if (hasTranscript == null) return true;

        boolean actualHasTranscript = hasTranscript(meeting.getId());
        return hasTranscript == actualHasTranscript;
    }

    // Date-based search implementations - ✅ FIXED: All use userOrAttendee methods
    private Page<Meeting> findMeetingsForDate(User user, LocalDate date, Pageable pageable) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
        return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(user, startOfDay, endOfDay, pageable);
    }

    private Page<Meeting> findMeetingsForWeek(User user, LocalDate date, Pageable pageable) {
        LocalDateTime startOfWeek = date.with(java.time.DayOfWeek.MONDAY).atStartOfDay();
        LocalDateTime endOfWeek = startOfWeek.plusDays(7);
        return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(user, startOfWeek, endOfWeek, pageable);
    }

    private Page<Meeting> findMeetingsForMonth(User user, YearMonth yearMonth, Pageable pageable) {
        LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(23, 59, 59);
        return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(user, startOfMonth, endOfMonth, pageable);
    }

    private Page<Meeting> findMeetingsForYear(User user, Year year, Pageable pageable) {
        LocalDateTime startOfYear = year.atDay(1).atStartOfDay();
        LocalDateTime endOfYear = year.atMonth(12).atEndOfMonth().atTime(23, 59, 59);
        return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(user, startOfYear, endOfYear, pageable);
    }

    private Page<Meeting> findMeetingsForQuarter(User user, Year year, int quarter, Pageable pageable) {
        int startMonth = (quarter - 1) * 3 + 1;
        int endMonth = startMonth + 2;

        LocalDateTime startOfQuarter = year.atMonth(startMonth).atDay(1).atStartOfDay();
        LocalDateTime endOfQuarter = year.atMonth(endMonth).atEndOfMonth().atTime(23, 59, 59);

        return meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(user, startOfQuarter, endOfQuarter, pageable);
    }

    // The rest of your methods (buildSearchResponse, convertToSearchResult, etc.) remain the same
    // They don't need changes because they work with Meeting objects regardless of how they were fetched

    private SearchResponse buildSearchResponse(Page<Meeting> meetingsPage, SearchRequest request, User user) {
        List<MeetingSearchResult> results = meetingsPage.getContent().stream()
                .map(this::convertToSearchResult)
                .collect(Collectors.toList());

        Map<String, Long> dateGroupCounts = buildDateGroupCounts(meetingsPage.getContent(), request.getDateGrouping());
        Map<String, Object> facets = buildFacets(meetingsPage.getContent(), user);

        return SearchResponse.builder()
                .results(results)
                .totalResults(meetingsPage.getTotalElements())
                .totalPages(meetingsPage.getTotalPages())
                .currentPage(meetingsPage.getNumber())
                .dateGroupCounts(dateGroupCounts)
                .facets(facets)
                .statusFacet(buildStatusFacet(meetingsPage.getContent()))
                .seriesFacet(buildSeriesFacet(meetingsPage.getContent()))
                .dateFacet(buildDateFacet(meetingsPage.getContent()))
                .build();
    }

    private Map<String, Long> buildDateGroupCounts(List<Meeting> meetings, String dateGrouping) {
        if (dateGrouping == null) {
            return Map.of();
        }

        return meetings.stream()
                .collect(Collectors.groupingBy(
                        meeting -> formatDateForGrouping(
                                meeting.getScheduledTime() != null ? meeting.getScheduledTime() : meeting.getCreatedAt(),
                                dateGrouping
                        ),
                        Collectors.counting()
                ));
    }

    private String formatDateForGrouping(LocalDateTime dateTime, String grouping) {
        if (dateTime == null) return "unscheduled";

        return switch (grouping.toLowerCase()) {
            case "day" -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
            case "week" -> dateTime.toLocalDate().format(DateTimeFormatter.ofPattern("yyyy-'W'ww"));
            case "month" -> YearMonth.from(dateTime).format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case "year" -> String.valueOf(dateTime.getYear());
            case "quarter" -> {
                int quarter = (dateTime.getMonthValue() - 1) / 3 + 1;
                yield dateTime.getYear() + "-Q" + quarter;
            }
            default -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        };
    }

    private Map<String, Object> buildFacets(List<Meeting> meetings, User user) {
        Map<String, Long> statusCounts = buildStatusFacet(meetings);
        Map<String, Long> seriesCounts = buildSeriesFacet(meetings);
        Map<String, Long> dateCounts = buildDateFacet(meetings);
        Map<String, Long> categoryCounts = buildCategoryFacet(meetings, user);

        return Map.of(
                "status", statusCounts,
                "series", seriesCounts,
                "date", dateCounts,
                "category", categoryCounts
        );
    }

    private Map<String, Long> buildStatusFacet(List<Meeting> meetings) {
        return meetings.stream()
                .collect(Collectors.groupingBy(
                        meeting -> meeting.getStatus().name(),
                        Collectors.counting()
                ));
    }

    private Map<String, Long> buildSeriesFacet(List<Meeting> meetings) {
        return meetings.stream()
                .filter(meeting -> meeting.getSeries() != null)
                .collect(Collectors.groupingBy(
                        meeting -> meeting.getSeries().getTitle(),
                        Collectors.counting()
                ));
    }

    private Map<String, Long> buildDateFacet(List<Meeting> meetings) {
        return meetings.stream()
                .collect(Collectors.groupingBy(
                        meeting -> {
                            LocalDateTime date = meeting.getScheduledTime() != null ?
                                    meeting.getScheduledTime() : meeting.getCreatedAt();
                            return date != null ?
                                    date.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE) : "unscheduled";
                        },
                        Collectors.counting()
                ));
    }

    private Map<String, Long> buildCategoryFacet(List<Meeting> meetings, User user) {
        Map<String, Long> categories = new HashMap<>();

        // Count by status categories
        categories.put("processed", meetings.stream()
                .filter(m -> m.getStatus() == MeetingStatus.PROCESSED)
                .count());

        categories.put("upcoming", meetings.stream()
                .filter(m -> m.getScheduledTime() != null && m.getScheduledTime().isAfter(LocalDateTime.now()))
                .count());

        categories.put("withTranscript", meetings.stream()
                .filter(m -> hasTranscript(m.getId()))
                .count());

        categories.put("withActions", meetings.stream()
                .filter(m -> m.getActionItems() != null && !m.getActionItems().isEmpty())
                .count());

        return categories;
    }

    private MeetingSearchResult convertToSearchResult(Meeting meeting) {
        return MeetingSearchResult.builder()
                .meetingId(meeting.getId().toString())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus().name())
                .meetingDate(meeting.getScheduledTime())
                .createdAt(meeting.getCreatedAt())
                .participantCount(meeting.getAttendees() != null ? meeting.getAttendees().size() : 0)
                .actionItemCount(meeting.getActionItems() != null ? meeting.getActionItems().size() : 0)
                .hasTranscript(hasTranscript(meeting.getId()))
                .seriesTitle(meeting.getSeries() != null ? meeting.getSeries().getTitle() : null)
                .matchingFields(List.of("title", "description")) // Simplified - you'd calculate this based on search
                .relevanceScore(1.0) // Simplified - you'd get this from full-text search
                .highlight(meeting.getTitle()) // Simplified - you'd generate highlights
                .build();
    }

    private boolean hasTranscript(UUID meetingId) {
        return transcriptRepository.findByMeetingId(meetingId).isPresent();
    }

    // MongoDB Transcript Search - ✅ FIXED: Use userOrAttendee for access control
    public SearchResponse searchTranscripts(String query, User user, int page, int size) {
        log.info("Searching transcripts for user: {} with query: {}", user.getEmail(), query);

        // ✅ FIXED: Get meetings user created OR is attending
        List<UUID> userMeetingIds = meetingRepository.findByUserOrAttendee(user, Pageable.unpaged())
                .stream()
                .map(Meeting::getId)
                .collect(Collectors.toList());

        if (userMeetingIds.isEmpty()) {
            return SearchResponse.builder()
                    .results(new ArrayList<>())
                    .totalResults(0L)
                    .totalPages(0)
                    .currentPage(page)
                    .build();
        }

        // Create text search criteria
        TextCriteria criteria = TextCriteria.forDefaultLanguage()
                .matching(query)
                .caseSensitive(false);

        TextQuery textQuery = (TextQuery) TextQuery.queryText(criteria)
                .sortByScore()
                .with(PageRequest.of(page, size));

        // Add access control
        textQuery.addCriteria(Criteria.where("meetingId").in(userMeetingIds));

        // Execute search
        List<com.meetingminutes.backend.document.Transcript> transcripts =
                mongoTemplate.find(textQuery, com.meetingminutes.backend.document.Transcript.class);

        // Get total count for pagination
        long totalCount = mongoTemplate.count(TextQuery.queryText(criteria)
                        .addCriteria(Criteria.where("meetingId").in(userMeetingIds)),
                com.meetingminutes.backend.document.Transcript.class);

        // Convert to search results
        List<MeetingSearchResult> results = transcripts.stream()
                .map(this::convertTranscriptToSearchResult)
                .collect(Collectors.toList());

        int totalPages = (int) Math.ceil((double) totalCount / size);

        return SearchResponse.builder()
                .results(results)
                .totalResults(totalCount)
                .totalPages(totalPages)
                .currentPage(page)
                .build();
    }

    private MeetingSearchResult convertTranscriptToSearchResult(com.meetingminutes.backend.document.Transcript transcript) {
        // Get meeting details for context
        Meeting meeting = meetingRepository.findById(transcript.getMeetingId()).orElse(null);

        if (meeting == null) {
            return MeetingSearchResult.builder()
                    .meetingId(transcript.getMeetingId().toString())
                    .title("Meeting not found")
                    .highlight(truncateText(transcript.getRawText(), 200))
                    .matchingFields(List.of("transcript"))
                    .relevanceScore(1.0)
                    .build();
        }

        return MeetingSearchResult.builder()
                .meetingId(transcript.getMeetingId().toString())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus().name())
                .meetingDate(meeting.getScheduledTime())
                .createdAt(meeting.getCreatedAt())
                .participantCount(meeting.getAttendees() != null ? meeting.getAttendees().size() : 0)
                .actionItemCount(meeting.getActionItems() != null ? meeting.getActionItems().size() : 0)
                .hasTranscript(true)
                .seriesTitle(meeting.getSeries() != null ? meeting.getSeries().getTitle() : null)
                .highlight(truncateText(transcript.getRawText(), 200))
                .matchingFields(List.of("transcript"))
                .relevanceScore(1.0) // MongoDB text search provides score
                .build();
    }

    private String truncateText(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }

    // Analytics and reporting - ✅ FIXED: Use userOrAttendee methods
    public Map<String, Long> getMeetingAnalytics(User user, String period, LocalDateTime startDate, LocalDateTime endDate) {
        try {
            // ✅ FIXED: Get meetings user created OR is attending
            List<Meeting> meetings = meetingRepository.findByUserOrAttendeeAndScheduledTimeBetween(
                    user, startDate, endDate, Pageable.unpaged()).getContent();

            // Group by period manually
            return meetings.stream()
                    .collect(Collectors.groupingBy(
                            meeting -> formatDateForAnalytics(
                                    meeting.getScheduledTime() != null ? meeting.getScheduledTime() : meeting.getCreatedAt(),
                                    period
                            ),
                            Collectors.counting()
                    ));
        } catch (Exception e) {
            log.warn("Failed to get meeting analytics for user {}, returning empty map", user.getEmail(), e);
            return Map.of();
        }
    }

    private String formatDateForAnalytics(LocalDateTime dateTime, String period) {
        if (dateTime == null) return "unscheduled";

        return switch (period.toLowerCase()) {
            case "daily", "day" -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
            case "weekly", "week" -> dateTime.toLocalDate().format(DateTimeFormatter.ofPattern("yyyy-'W'ww"));
            case "monthly", "month" -> YearMonth.from(dateTime).format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case "quarterly", "quarter" -> {
                int quarter = (dateTime.getMonthValue() - 1) / 3 + 1;
                yield dateTime.getYear() + "-Q" + quarter;
            }
            case "yearly", "year" -> String.valueOf(dateTime.getYear());
            default -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        };
    }

    private String formatAnalyticsPeriod(java.sql.Timestamp timestamp, String periodType) {
        LocalDateTime dateTime = timestamp.toLocalDateTime();
        return switch (periodType) {
            case "day" -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
            case "week" -> dateTime.toLocalDate().format(DateTimeFormatter.ofPattern("yyyy-'W'ww"));
            case "month" -> YearMonth.from(dateTime).format(DateTimeFormatter.ofPattern("yyyy-MM"));
            case "quarter" -> {
                int quarter = (dateTime.getMonthValue() - 1) / 3 + 1;
                yield dateTime.getYear() + "-Q" + quarter;
            }
            case "year" -> String.valueOf(dateTime.getYear());
            default -> dateTime.toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE);
        };
    }
}