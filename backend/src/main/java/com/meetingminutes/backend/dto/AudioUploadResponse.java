package com.meetingminutes.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AudioUploadResponse {
    private String fileId;
    private String fileName;
    private String filePath;
    private String fileSize;
    private String contentType;
    private String uploadStatus;
    private String message;
    private boolean success;
    private UUID meetingId;
}