package com.meetingminutes.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {

    @Value("${app.upload.temp-directory:/tmp/uploads}")
    private String tempUploadDirectory;

    @Value("${app.upload.max-file-size:524288000}")
    private long maxFileSize;

    private static final List<String> ALLOWED_AUDIO_TYPES = Arrays.asList(
            "audio/mpeg",      // MP3
            "audio/wav",       // WAV
            "audio/x-wav",     // WAV
            "audio/mp4",       // M4A
            "audio/x-m4a",     // M4A
            "audio/flac",      // FLAC
            "audio/ogg",       // OGG
            "audio/webm"       // WEBM
    );

    public String uploadAudioFile(MultipartFile file, UUID meetingId) {

        log.info("Uploading audio file for meeting: {}, original filename: {}", meetingId, file.getOriginalFilename());

        validateAudioFile(file);

        try {

            Path uploadPath = Paths.get(tempUploadDirectory);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String fileExtension = getFileExtension(file.getOriginalFilename());
            String fileName = String.format("%s_%s%s", meetingId, UUID.randomUUID(), fileExtension);
            Path filePath = uploadPath.resolve(fileName);

            Files.copy(file.getInputStream(), filePath);
            log.info("Audio file saved successfully: {}", filePath);

            return filePath.toString();
        } catch (IOException e) {
            log.error("Failed to upload audio file for meeting: {}", meetingId, e);
            throw new RuntimeException("Failed to upload audio file: " + e.getMessage(), e);
        }
    }

    private void validateAudioFile(MultipartFile file) {
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException(
                    String.format("File size too large. Maximum allowed: %dMB", maxFileSize / (1024 *1024))
            );
        }

        if (file.isEmpty()) {
            throw new RuntimeException("Uploaded file is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AUDIO_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException(
                    String.format("Unsupported audio format: %s. Allowed formats: MP3, WAV, M4A, FLAC, OGG", contentType)
            );
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new RuntimeException("Invalid filename");
        }

        log.debug("Audio file validation passed: {}, size: {}, type: {}",
                originalFilename, file.getSize(), contentType);
    }

    public void cleanupTempFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                Files.delete(path);
                log.info("Temporary file cleaned up: {}", filePath);
            }
        } catch (IOException e) {
            log.warn("Failed to cleanup temporary file: {}", filePath, e);
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return ".audio";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    public boolean isValidFilePath(String filePath) {
        try {
            Path path = Paths.get(filePath);
            return Files.exists(path) && Files.isRegularFile(path);
        } catch (Exception e) {
            return false;
        }
    }

    public String getFileSizeReadable(long size) {
        if (size < 1024) return size + " B";
        int exp = (int) (Math.log(size) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp-2) + "B";
        return String.format("%.1f %s", size / Math.pow(1024, exp), pre);
    }
}
