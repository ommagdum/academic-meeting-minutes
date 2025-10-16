package com.meetingminutes.backend.repository.mongo;

import com.meetingminutes.backend.document.GeneratedDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GeneratedDocumentRepo extends MongoRepository<GeneratedDocument, String> {

    List<GeneratedDocument> findByMeetingId(UUID meetingId);

    Optional<GeneratedDocument> findByMeetingIdAndDocumentType(UUID meetingId, GeneratedDocument.DocumentType documentType);

    @Query("{ 'meeting_id': ?0, 'document_type': ?1 }")
    List<GeneratedDocument> findDocumentsByMeetingAndType(UUID meetingId, GeneratedDocument.DocumentType documentType);

    @Query(value = "{ 'meeting_id': ?0 }", delete = true)
    void deleteByMeetingId(UUID meetingId);

    boolean existsByMeetingIdAndDocumentType(UUID meetingId, GeneratedDocument.DocumentType documentType);
}