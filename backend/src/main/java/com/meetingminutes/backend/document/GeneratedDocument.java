package com.meetingminutes.backend.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "documents.files") // GridFS files collection
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeneratedDocument {

    @Id
    private String id;

    @Field("filename")
    private String filename;

    @Field("meeting_id")
    private UUID meetingId;

    @Field("document_type")
    private DocumentType documentType;

    @Field("content_type")
    private String contentType;

    @Field("file_size")
    private Long fileSize;

    @Field("version")
    private Integer version;

    @Field("generated_at")
    private LocalDateTime generatedAt;

    @Field("metadata")
    private DocumentMetadata metadata;

    public enum DocumentType {
        MINUTES_PDF, MINUTES_DOCX
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentMetadata {
        private String meetingTitle;
        private String organizerName;
        private LocalDateTime meetingDate;
        private Integer attendeeCount;
        private Integer actionItemCount;
        private Boolean hasAIExtraction;
    }
}