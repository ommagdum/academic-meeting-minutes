package com.meetingminutes.backend.repository.mongo;

import com.meetingminutes.backend.document.AIExtraction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AIExtractionRepository extends MongoRepository<AIExtraction, String> {

    Optional<AIExtraction> findByMeetingId(UUID meetingId);
    boolean existsByMeetingId(UUID meetingId);
    void deleteByMeetingId(UUID meetingId);

    @Query("{ 'meeting_id': ?0 }")
    Optional<AIExtraction> findExtractionByMeetingId(UUID meetingId);

    @Query("{ 'success': true, 'confidence_score': { $gte: ?0 } }")
    List<AIExtraction> findSuccessfulExtractionsWithMinConfidence(Double minConfidence);

    @Query("{ 'success': false }")
    List<AIExtraction> findFailedExtractions();

    @Query("{ 'created_at': { $gte: ?0, $lte: ?1 } }")
    List<AIExtraction> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = "{ 'meeting_id': ?0 }", fields = "{ 'extracted_data': 1, 'processing_time': 1 }")
    Optional<AIExtraction> findBasicExtractionInfoByMeetingId(UUID meetingId);

    @Query(value = "{ 'model_version': ?0 }")
    List<AIExtraction> findByModelVersion(String modelVersion);

    @Query(value = "{}", count = true)
    long countAllExtractions();

    @Query(value = "{ 'success': true }", count = true)
    long countSuccessfulExtractions();

    @Query(value = "{ 'success': false }", count = true)
    long countFailedExtractions();
}