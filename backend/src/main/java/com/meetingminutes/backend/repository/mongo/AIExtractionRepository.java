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

    @Query("{ 'meetingId': ?0 }")
    Optional<AIExtraction> findExtractionByMeetingId(UUID meetingId);

    @Query("{ 'success': true, 'confidenceScore': { $gte: ?0 } }")
    List<AIExtraction> findSuccessfulExtractionsWithMinConfidence(Double minConfidence);

    @Query("{ 'success': false }")
    List<AIExtraction> findFailedExtractions();

    @Query("{ 'createdAt': { $gte: ?0, $lte: ?1 } }")
    List<AIExtraction> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = "{ 'meetingId': ?0 }", fields = "{ 'extractedData': 1, 'processingTime':1 }")
    Optional<AIExtraction> findBasicExtractionInfoByMeetingId(UUID meetingId);

    @Query(value = "{ 'modelVersion': ?0 }")
    List<AIExtraction> findByModelVersion(String modelVersion);

    @Query(value = "{}", count = true)
    long countAllExtractions();

    @Query(value = "{ 'success': true}", count = true)
    long countSuccessfulExtractions();

    @Query(value = "{ 'success': false}", count = true)
    long countFailedExtractions();

}
