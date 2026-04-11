package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.Meeting;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
@Transactional(readOnly = true)
public class MeetingRepositoryImpl implements MeetingRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<Meeting> fullTextSearchWithDynamicSort(UUID userId, String query, String sortField, String sortDirection, Pageable pageable) {
        // Build the base SQL
        String baseSql = "SELECT m.* FROM meetings m " +
                "WHERE (m.created_by = :userId OR m.id IN (SELECT a.meeting_id FROM attendees a WHERE a.user_id = :userId)) " +
                "AND m.search_vector @@ plainto_tsquery('english', :query)";

        // Add ranking if sorting by relevance
        String orderByClause;
        if ("relevance".equals(sortField)) {
            baseSql = baseSql.replace("SELECT m.*", "SELECT m.*, ts_rank_cd(m.search_vector, plainto_tsquery('english', :query)) as rank");
            orderByClause = "ORDER BY rank DESC";
        } else {
            // Sort by a regular column
            String column = mapSortFieldToColumn(sortField);
            String safeDirection = "ASC".equalsIgnoreCase(sortDirection) ? "ASC" : "DESC";
            orderByClause = "ORDER BY " + column + " " + safeDirection;
        }

        String countSql = "SELECT COUNT(*) FROM meetings m " +
                "WHERE (m.created_by = :userId OR m.id IN (SELECT a.meeting_id FROM attendees a WHERE a.user_id = :userId)) " +
                "AND m.search_vector @@ plainto_tsquery('english', :query)";

        String finalSql = baseSql + " " + orderByClause;

        // Create native query
        Query queryObj = entityManager.createNativeQuery(finalSql, Meeting.class);
        queryObj.setParameter("userId", userId);
        queryObj.setParameter("query", query);

        // Set pagination
        queryObj.setFirstResult((int) pageable.getOffset());
        queryObj.setMaxResults(pageable.getPageSize());

        List<Meeting> content = queryObj.getResultList();

        // Get total count
        Query countQuery = entityManager.createNativeQuery(countSql);
        countQuery.setParameter("userId", userId);
        countQuery.setParameter("query", query);
        long total = ((Number) countQuery.getSingleResult()).longValue();

        return new PageImpl<>(content, pageable, total);
    }

    private String mapSortFieldToColumn(String sortField) {
        return switch (sortField) {
            case "createdAt" -> "m.created_at";
            case "title" -> "m.title";
            case "scheduledTime" -> "m.scheduled_time";
            default -> "m.created_at"; // fallback
        };
    }
}