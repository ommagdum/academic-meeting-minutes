package com.meetingminutes.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
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

        // Add upcoming meetings count
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

    public Map<String, Object> getProcessingPerformance() {
        String sql = """
            SELECT
                AVG(processing_time) as avg_processing_time,
                MAX(processing_time) as max_processing_time,
                MIN(processing_time) as min_processing_time,
                COUNT(*) as total_processed
            FROM transcripts
            WHERE processing_time IS NOT NULL
        """;

        return jdbcTemplate.queryForMap(sql);
    }

    public List<Map<String, Object>> getAIExtractionAccuracy() {
        String sql = """
            SELECT
                model_version,
                AVG(confidence_score) as avg_confidence,
                COUNT(*) as extraction_count,
                COUNT(CASE WHEN success = true THEN 1 END) as success_count
            FROM ai_extractions
            GROUP BY model_version
            ORDER BY avg_confidence DESC
        """;

        return jdbcTemplate.queryForList(sql);
    }
}
