package com.meetingminutes.backend.service;

import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbcTemplate;
    private final MongoTemplate mongoTemplate;

    public Map<String, Object> getMeetingStatsByUser(UUID userId) {
        String sql = """
            SELECT
                COUNT(*) as total_meetings,
                COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_meetings,
                COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_meetings,
                COUNT(CASE WHEN status = 'PROCESSING' THEN 1 END) as processing_meetings,
                COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_meetings
            FROM meetings
            WHERE created_by = ?
        """;
        return jdbcTemplate.queryForMap(sql, userId);
    }

    public Map<String, Object> getParticipantStats(UUID userId) {
        String sql = """
            SELECT
                COUNT(DISTINCT a.user_id) as unique_participants,
                COUNT(a.id) as total_participations
            FROM attendees a
            JOIN meetings m ON a.meeting_id = m.id
            WHERE m.created_by = ?
        """;
        return jdbcTemplate.queryForMap(sql, userId);
    }

    public Map<String, Object> getTaskStatsByUser(UUID userId) {
        String sql = """
            SELECT
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_tasks
            FROM action_items ai
            JOIN meetings m ON ai.meeting_id = m.id
            WHERE m.created_by = ?
        """;
        return jdbcTemplate.queryForMap(sql, userId);
    }

    public List<Map<String, Object>> getMonthlyMeetingTrend(UUID userId, int monthsBack) {
        String sql = """
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') as month,
                COUNT(*) as meeting_count,
                COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count
            FROM meetings
            WHERE created_by = ?
              AND created_at >= ?
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT ?
        """;
        LocalDateTime startDate = LocalDateTime.now().minusMonths(monthsBack);
        return jdbcTemplate.queryForList(sql, userId, startDate, monthsBack);
    }

    public Map<String, Object> getUserDashboardStats(UUID userId) {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("meetingStats", getMeetingStatsByUser(userId));
        dashboard.put("taskStats", getTaskStatsByUser(userId));
        dashboard.put("participantStats", getParticipantStats(userId));
        dashboard.put("recentTrend", getMonthlyMeetingTrend(userId, 6));

        String upcomingMeetingsSql = """
            SELECT COUNT(*) FROM meetings
            WHERE created_by = ? AND scheduled_time > ? AND scheduled_time < ?
        """;
        Long upcomingMeetings = jdbcTemplate.queryForObject(
                upcomingMeetingsSql,
                Long.class,
                userId,
                LocalDateTime.now(),
                LocalDateTime.now().plusDays(7)
        );
        dashboard.put("upcomingMeetings", upcomingMeetings != null ? upcomingMeetings : 0);

        return dashboard;
    }

    public List<Map<String, Object>> getTopParticipants(UUID userId, int limit) {
        String sql = """
            SELECT
                u.name,
                u.email,
                COUNT(a.id) as meeting_count
            FROM attendees a
            JOIN meetings m ON a.meeting_id = m.id
            JOIN users u ON a.user_id = u.id
            WHERE m.created_by = ?
            GROUP BY u.id, u.name, u.email
            ORDER BY meeting_count DESC
            LIMIT ?
        """;
        return jdbcTemplate.queryForList(sql, userId, limit);
    }

    // ---- FIXED: was querying PostgreSQL for MongoDB-only tables ----

    public Map<String, Object> getProcessingPerformance() {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(
                        org.springframework.data.mongodb.core.query.Criteria
                                .where("processing_time").ne(null)
                ),
                Aggregation.group()
                        .avg("processing_time").as("avg_processing_time")
                        .max("processing_time").as("max_processing_time")
                        .min("processing_time").as("min_processing_time")
                        .count().as("total_processed")
        );

        AggregationResults<Map> results = mongoTemplate.aggregate(
                agg, "transcripts", Map.class
        );

        if (results.getMappedResults().isEmpty()) {
            Map<String, Object> empty = new HashMap<>();
            empty.put("avg_processing_time", 0);
            empty.put("max_processing_time", 0);
            empty.put("min_processing_time", 0);
            empty.put("total_processed", 0);
            return empty;
        }

        return results.getMappedResults().get(0);
    }

    public List<Map<String, Object>> getAIExtractionAccuracy() {
        Aggregation agg = Aggregation.newAggregation(
                Aggregation.group("model_version")
                        .avg("confidence_score").as("avg_confidence")
                        .count().as("extraction_count")
                        .sum(
                                ConditionalOperators
                                        .when(org.springframework.data.mongodb.core.query.Criteria
                                                .where("success").is(true))
                                        .then(1)
                                        .otherwise(0)
                        ).as("success_count"),
                Aggregation.sort(
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC,
                                "avg_confidence"
                        )
                )
        );

        AggregationResults<Map> results = mongoTemplate.aggregate(
                agg, "ai_extractions", Map.class
        );

        return (List<Map<String, Object>>) (List<?>) results.getMappedResults();
    }
}