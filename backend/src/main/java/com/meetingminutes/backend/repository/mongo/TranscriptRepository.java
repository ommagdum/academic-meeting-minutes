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

    @Query("{ 'meeting_id': ?0 }")
    Optional<Transcript> findTranscriptByMeetingId(UUID meetingId);

    @Query("{ 'confidence_score': { $gte: ?0 } }")
    List<Transcript> findByConfidenceScoreGreaterThanEqual(Double minConfidence);

    @Query("{ 'created_at': { $gte: ?0, $lte: ?1 } }")
    List<Transcript> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = "{ 'meeting_id': ?0 }", fields = "{ 'raw_text': 1, 'processing_time': 1 }")
    Optional<Transcript> findBasicTranscriptionInfoByMeetingId(UUID meetingId);

    @Query(value = "{ 'meeting_id': ?0 }", fields = "{ 'word_timestamps': 1 }")
    Optional<Transcript> findWordTimestampByMeetingId(UUID meetingId);

    @Query(value = "{}", count = true)
    long countAllTranscripts();

    @Query(value = "{ 'processing_time': { $gt: ?0 } }", count = true)
    long countTranscriptsWithProcessingTimeGreaterThan(Double processingTime);

    @Query("{ 'meeting_id': { $in: ?0 } }")
    List<Transcript> findByMeetingIdIn(List<UUID> meetingIds);
}