package com.meetingminutes.backend.dto.ai;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class TranscriptionRequest {
    private MultipartFile file;
    private String language = "en";
    private String meetingId;

    public TranscriptionRequest(MultipartFile file, String meetingId) {
        this.file = file;
        this.meetingId = meetingId;
    }
}
