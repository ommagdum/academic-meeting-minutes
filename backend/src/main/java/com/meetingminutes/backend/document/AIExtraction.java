package com.meetingminutes.backend.document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "ai_extractions")
@Getter
@Setter
public class AIExtraction {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("meeting_id")
    private UUID meetingId;

    @Field("extracted_data")
    private ExtractedData extractedData;

    @Field("processing_time")
    private Double processingTime;

    @Field("model_version")
    private String modelVersion;

    @Field("extraction_prompt")
    private String extractionPrompt;

    @Field("raw_ai_response")
    private String rawAIResponse;

    @Field("confidence_score")
    private Double confidenceScore;

    @Field("success")
    private Boolean success = true;

    @Field("error_message")
    private String errorMessage;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("updated_at")
    private LocalDateTime updatedAt;

    public AIExtraction() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public AIExtraction(UUID meetingId, ExtractedData extractedData, Double processingTime, String modelVersion) {
        this();
        this.meetingId = meetingId;
        this.extractedData = extractedData;
        this.processingTime = processingTime;
        this.modelVersion = modelVersion;
    }
}
