package com.meetingminutes.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@Slf4j
public class DatabaseIndexConfig {

    private final MongoMappingContext mongoMappingContext;
    private final JdbcTemplate jdbcTemplate;
    private final MongoTemplate mongoTemplate;

    public DatabaseIndexConfig(MongoMappingContext mongoMappingContext, MongoTemplate mongoTemplate, JdbcTemplate jdbcTemplate) {
        this.mongoMappingContext = mongoMappingContext;
        this.mongoTemplate = mongoTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initIndicesAfterStartup() {
        // Spring Data MongoDB handle index creation automatically
        // based on @Indexed annotations in document classes

        System.out.println("MongoDB index auto-creation is enabled via @Indexed annotations");
    }

    @PostConstruct
    public void createIndexes() {
        createPostgreSQLIndexes();
        createMongoDBIndexes();
    }

    private void createPostgreSQLIndexes() {
        try {
            // Full-text search indexes
            jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_meetings_search_vector 
                ON meetings USING gin(to_tsvector('english', 
                    COALESCE(title, '') || ' ' || 
                    COALESCE(description, '') || ' ' || 
                    COALESCE(agenda_text, '')))
            """);

            // Performance indexes for common queries
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_meetings_created_by_status ON meetings(created_by, status)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_time ON meetings(scheduled_time)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_meetings_series_status ON meetings(series_id, status)");

            // Composite indexes for search performance
            jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_meetings_created_by_date 
                ON meetings(created_by, scheduled_time, created_at)
            """);

            log.info("PostgreSQL indexes created successfully");
        } catch (Exception e) {
            log.warn("Failed to create PostgreSQL indexes: {}", e.getMessage());
        }
    }

    private void createMongoDBIndexes() {
        try {
            // Text search index for transcripts
            TextIndexDefinition textIndex = new TextIndexDefinition.TextIndexDefinitionBuilder()
                    .onField("rawText")
                    .onField("wordTimestamps.word")
                    .build();

            mongoTemplate.indexOps("transcripts").createIndex(textIndex);

            // Regular indexes for performance
            mongoTemplate.indexOps("transcripts").createIndex(
                    new org.springframework.data.mongodb.core.index.Index().on("meetingId", org.springframework.data.domain.Sort.Direction.ASC)
            );

            mongoTemplate.indexOps("transcripts").createIndex(
                    new org.springframework.data.mongodb.core.index.Index().on("createdAt", org.springframework.data.domain.Sort.Direction.DESC)
            );

            // Text search index for AI extractions
            TextIndexDefinition extractionIndex = new TextIndexDefinition.TextIndexDefinitionBuilder()
                    .onField("extractedData.decisions.topic")
                    .onField("extractedData.decisions.decision")
                    .onField("extractedData.actionItems.description")
                    .onField("extractedData.topicsDiscussed.summary")
                    .build();

            mongoTemplate.indexOps("ai_extractions").createIndex(extractionIndex);

            log.info("MongoDB indexes created successfully");
        } catch (Exception e) {
            log.warn("Failed to create MongoDB indexes: {}", e.getMessage());
        }
    }

}
