package com.meetingminutes.backend.document;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Document(collection = "transcripts")
@Getter
@Setter
public class Transcript {

    @Id
    private String id;

    @Indexed(unique = true)
    @Field("meeting_id")
    private UUID meetingId;

    @Field("raw_text")
    private String rawText;

    @Field("word_timestamps")
    private List<WordTimestamp> wordTimestamps;

    @Field("processing_time")
    private Double processingTime;

    @Field("audio_duration")
    private Double audioDuration;

    @Field("confidence_score")
    private Double confidenceScore;

    @Field("language")
    private String language;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("updated_at")
    private LocalDateTime updatedAt;

    private String deviceUsed;

    public Transcript() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Transcript(UUID meetingId, String rawText, List<WordTimestamp> wordTimestamps,
                      Double processingTime, Double audioDuration) {
        this();
        this.meetingId = meetingId;
        this.rawText = rawText;
        this.wordTimestamps = wordTimestamps;
        this.processingTime = processingTime;
        this.audioDuration = audioDuration;
    }
}
