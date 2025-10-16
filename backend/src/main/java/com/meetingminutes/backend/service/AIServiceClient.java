package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.ai.ExtractionRequest;
import com.meetingminutes.backend.dto.ai.ExtractionResponse;
import com.meetingminutes.backend.dto.ai.TranscriptionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.io.File;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class AIServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai.service.base-url:http://localhost:5001}")
    private String aiServiceBaseUrl;

    @Value("${ai.service.timeout:300000}") // 5 minutes
    private int timeout;

    public TranscriptionResponse transcribeAudio(String audioFilePath, UUID meetingId) {
        log.info("Sending transcription request for meetingId: {}", meetingId);

        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            File audioFile = new File(audioFilePath);

            if (!audioFile.exists()) {
                throw new RuntimeException("Audio file not found: " + audioFilePath);
            }

            body.add("file", new FileSystemResource(audioFile));
            if(meetingId != null) {
                body.add("meeting_id", meetingId.toString());
            }
            body.add("language", "en");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            String url = aiServiceBaseUrl + "/ai/transcribe";
            log.debug("Calling AI service transcription endpoint: {}", url);

            ResponseEntity<TranscriptionResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    TranscriptionResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                TranscriptionResponse transcriptionResponse = response.getBody();
                if (transcriptionResponse.isSuccess()) {
                    log.info("Transcription successful for meeting: {}, duration: {}s",
                            meetingId, transcriptionResponse.getProcessingTime());
                    return transcriptionResponse;
                } else {
                    throw new RuntimeException("AI service transcription failed");
                }
            } else {
                throw new RuntimeException("AI service returned error: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Transcription API call failed for meeting: {}", meetingId, e);
            throw new RuntimeException("Transcription service unavailable: " + e.getMessage(), e);
        }
    }

    public ExtractionResponse extractInformation(ExtractionRequest extractionRequest) {
        log.info("Sending extraction request to AI service for meeting: {}",
                extractionRequest.getMeetingId());

        log.info("📝 Extraction Request - transcript length: {}",
                extractionRequest.getTranscriptText() != null ?
                        extractionRequest.getTranscriptText().length() : 0);
        log.info("📝 Extraction Request - transcript preview: {}",
                extractionRequest.getTranscriptText() != null ?
                        extractionRequest.getTranscriptText().substring(0, Math.min(100, extractionRequest.getTranscriptText().length())) : "NULL");

        try {
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<ExtractionRequest> requestEntity =
                    new HttpEntity<>(extractionRequest, headers);

            // Make API call
            String url = aiServiceBaseUrl + "/ai/extract";
            log.debug("Calling AI service extraction endpoint: {}", url);

            ResponseEntity<ExtractionResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    ExtractionResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ExtractionResponse extractionResponse = response.getBody();
                if (extractionResponse.isSuccess()) {
                    log.info("Extraction successful for meeting: {}, duration: {}s",
                            extractionRequest.getMeetingId(), extractionResponse.getProcessingTime());
                    return extractionResponse;
                } else {
                    throw new RuntimeException("AI service extraction failed");
                }
            } else {
                throw new RuntimeException("AI service returned error: " + response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("Extraction API call failed for meeting: {}",
                    extractionRequest.getMeetingId(), e);
            throw new RuntimeException("Extraction service unavailable: " + e.getMessage(), e);
        }
    }

    public boolean isServiceHealthy() {
        try {
            String url = aiServiceBaseUrl + "/ai/health";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("AI service health check failed", e);
            return false;
        }
    }

    public Object processFullMeeting(String audioFilePath, UUID meetingId,
                                     Object additionalContext) {
        // This is a convenience method to use the combined endpoint
        log.info("Using full processing pipeline for meeting: {}", meetingId);

        // For now, we'll use separate calls as per our current design
        // This can be implemented later if needed
        throw new UnsupportedOperationException("Full pipeline processing not yet implemented");
    }
}
