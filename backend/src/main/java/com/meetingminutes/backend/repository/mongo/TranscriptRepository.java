package com.meetingminutes.backend.repository.mongo;

import com.meetingminutes.backend.document.Transcript;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TranscriptRepository extends MongoRepository<Transcript, String> {
    Optional<Transcript> findByMeetingId(UUID meetingId);
    boolean existsByMeetingId(UUID meetingId);
    void deleteByMeetingId(UUID meetingId);

    @Query("{ 'meetingId': ?0 }")
    Optional<Transcript> findTranscriptByMeetingId(UUID meetingId);

    @Query("{ 'confidenceScore': { $gte: ?0 } }")
    List<Transcript> findByConfidenceScoreGreaterThanEqual(Double minConfidence);

    @Query("{ 'createdAt': { $gte: ?0, $lte: ?1 } }")
    List<Transcript> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = "{ 'meetingId': ?0 }", fields = "{ 'rawText': 1, 'processingTime': 1 }")
    Optional<Transcript> findBasicTranscriptionInfoByMeetingId(UUID meetingId);

    @Query(value = "{ 'meetingId': ?0 }", fields = "{ 'wordTimestamps': 1 }")
    Optional<Transcript> findWordTimestampByMeetingId(UUID meetingId);

    @Query(value = "{}", count = true)
    long countAllTranscripts();

    @Query(value = "{ 'processingTime': { $gt: ?0 } }", count = true)
    long countTranscriptsWithProcessingTimeGreaterThan(Double processingTime);
}
