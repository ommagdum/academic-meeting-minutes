package com.meetingminutes.backend.service;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.ExtractedData;
import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.dto.ai.ExtractionRequest;
import com.meetingminutes.backend.dto.ai.ExtractionResponse;
import com.meetingminutes.backend.dto.ai.TranscriptionResponse;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.TaskStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class MeetingProcessingService {

    private final MeetingRepository meetingRepository;
    private final TranscriptRepository transcriptRepository;
    private final AIExtractionRepository aiExtractionRepository;
    private final FileUploadService fileUploadService;
    private final EmailService emailService;
    private final DocumentGenerationService documentGenerationService; // Fixed typo
    private final AIServiceClient aiServiceClient; // Added AI service client
    private final UserRepo userRepo;
    private final ActionItemRepo actionItemRepo;

    @Async
    public CompletableFuture<Void> processMeeting(UUID meetingId, User user) {
        log.info("Starting AI processing pipeline for meeting: {}", meetingId);

        try {
            // Get the meeting to retrieve the audio file path
            Meeting meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new RuntimeException("Meeting not found"));

            String audioFilePath = meeting.getAudioFilePath();
            if (audioFilePath == null) {
                throw new RuntimeException("No audio file found for this meeting. Please upload an audio file first.");
            }

            updateMeetingStatus(meetingId, MeetingStatus.PROCESSING, user);

            if (!fileUploadService.isValidFilePath(audioFilePath)) {
                throw new RuntimeException("Audio file not found: " + audioFilePath);
            }

            // Step 1: Transcription using AI service
            log.info("Starting transcription for meeting: {}", meetingId);
            Transcript transcript = transcribeAudio(meetingId, audioFilePath);
            log.info("Transcription completed for meeting: {}", meetingId);

            log.info("🔍 DEBUG - Transcript object: {}", transcript);
            log.info("🔍 DEBUG - Transcript rawText: {}",
                    transcript != null && transcript.getRawText() != null ?
                            "NOT NULL, length: " + transcript.getRawText().length() : "NULL");

            log.info("Transcription completed for meeting: {}", meetingId);

            // Step 2: AI Extraction using AI service
            log.info("Starting AI extraction for meeting: {}", meetingId);
            AIExtraction extraction = extractInformation(meetingId, transcript.getRawText());
            log.info("AI extraction completed for meeting: {}", meetingId);

            // NEW STEP: Create Action Items in PostgreSQL
            log.info("Creating action items for meeting: {}", meetingId);
            createActionItemsFromExtraction(meeting, extraction);
            log.info("Action items created for meeting: {}", meetingId);

            // Step 3: Document Generation
            log.info("Starting document generation for meeting: {}", meetingId);
            generateMeetingMinutes(meeting, extraction, user);
            log.info("Document generation completed for meeting: {}", meetingId);

            // Finalize processing
            updateMeetingStatus(meetingId, MeetingStatus.PROCESSED, user);
            emailService.sendProcessingCompleteNotification(user, meeting);
            fileUploadService.cleanupTempFile(audioFilePath);

            log.info("AI processing pipeline completed successfully for meeting: {}", meetingId);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("AI processing pipeline failed for meeting: {}", meetingId, e);

            updateMeetingStatus(meetingId, MeetingStatus.FAILED, user);

            return CompletableFuture.failedFuture(e);
        }
    }

    private Transcript transcribeAudio(UUID meetingId, String audioFilePath) {
        log.debug("Transcribing audio for meeting: {}, file: {}", meetingId, audioFilePath);

        try {
            // Call actual AI service for transcription
            TranscriptionResponse response = aiServiceClient.transcribeAudio(audioFilePath, meetingId);

            if (response == null || !response.isSuccess()) {
                throw new RuntimeException("Transcription service returned unsuccessful response");
            }

            // ✅ FIX: Check if transcript already exists and update it
            Optional<Transcript> existingTranscript = transcriptRepository.findByMeetingId(meetingId);
            Transcript transcript;

            if (existingTranscript.isPresent()) {
                // Update existing transcript
                transcript = existingTranscript.get();
                transcript.setRawText(response.getRawText());
                transcript.setWordTimestamps(response.getWordTimestamps());
                transcript.setProcessingTime(response.getProcessingTime());
                transcript.setAudioDuration(response.getAudioDuration());
                transcript.setConfidenceScore(response.getConfidenceScore());
                transcript.setLanguage(response.getLanguage());
                transcript.setDeviceUsed(response.getDeviceUsed());
                transcript.setUpdatedAt(LocalDateTime.now());
            } else {
                // Create new transcript
                transcript = new Transcript();
                transcript.setMeetingId(meetingId);
                transcript.setRawText(response.getRawText());
                transcript.setWordTimestamps(response.getWordTimestamps());
                transcript.setProcessingTime(response.getProcessingTime());
                transcript.setAudioDuration(response.getAudioDuration());
                transcript.setConfidenceScore(response.getConfidenceScore());
                transcript.setLanguage(response.getLanguage());
                transcript.setDeviceUsed(response.getDeviceUsed());
                transcript.setCreatedAt(LocalDateTime.now());
                transcript.setUpdatedAt(LocalDateTime.now());
            }

            log.debug("Transcription completed for meeting: {}", meetingId);
            return transcriptRepository.save(transcript);

        } catch (Exception e) {
            log.error("Transcription failed for meeting: {}", meetingId, e);
            throw new RuntimeException("Transcription failed: " + e.getMessage(), e);
        }
    }

    private AIExtraction extractInformation(UUID meetingId, String transcriptText) {
        log.debug("Extracting information from transcript for meeting: {}", meetingId);

        log.info("🔍 DEBUG - Transcript text parameter: {}",
                transcriptText != null ? "NOT NULL, length: " + transcriptText.length() : "NULL");
        log.info("🔍 DEBUG - Transcript text preview: {}",
                transcriptText != null ? transcriptText.substring(0, Math.min(100, transcriptText.length())) : "NULL");

        try {
            // Get meeting and agenda items for context
            Meeting meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new RuntimeException("Meeting not found"));

            // Prepare extraction request
            ExtractionRequest extractionRequest = new ExtractionRequest();
            extractionRequest.setTranscriptText(transcriptText);  // Explicitly set the text
            extractionRequest.setMeetingId(meetingId);
            extractionRequest.setAgendaItems(meeting.getAgendaItems() != null ?
                    meeting.getAgendaItems().stream()
                            .map(item -> new com.meetingminutes.backend.dto.CreateAgendaItemRequest(
                                    item.getTitle(),
                                    item.getDescription(),
                                    item.getEstimatedDuration()
                            ))
                            .toList()
                    : null);

            log.info("🔍 DEBUG - ExtractionRequest transcriptText: {}",
                    extractionRequest.getTranscriptText() != null ?
                            "NOT NULL, length: " + extractionRequest.getTranscriptText().length() : "NULL");

            // TODO: Add previous context from meeting series if usePreviousContext is true
            if (meeting.getUsePreviousContext() && meeting.getSeries() != null) {
                // This would require fetching previous meetings in the series
                log.debug("Previous context feature not yet implemented for meeting: {}", meetingId);
            }

            // Call actual AI service for extraction
            ExtractionResponse response = aiServiceClient.extractInformation(extractionRequest);

            if (response == null || !response.isSuccess()) {
                throw new RuntimeException("Extraction service returned unsuccessful response");
            }

            Optional<AIExtraction> existingExtraction = aiExtractionRepository.findByMeetingId(meetingId);
            AIExtraction extraction;

            if (existingExtraction.isPresent()) {
                // Update existing extraction
                extraction = existingExtraction.get();
                extraction.setExtractedData(response.getExtractedData());
                extraction.setModelVersion(response.getModelVersion());
                extraction.setProcessingTime(response.getProcessingTime());
                extraction.setConfidenceScore(response.getConfidenceScore());
                extraction.setSuccess(true);
                extraction.setUpdatedAt(LocalDateTime.now());
            } else {
                // Create new extraction
                extraction = new AIExtraction();
                extraction.setMeetingId(meetingId);
                extraction.setExtractedData(response.getExtractedData());
                extraction.setModelVersion(response.getModelVersion());
                extraction.setProcessingTime(response.getProcessingTime());
                extraction.setConfidenceScore(response.getConfidenceScore());
                extraction.setSuccess(true);
                extraction.setCreatedAt(LocalDateTime.now());
                extraction.setUpdatedAt(LocalDateTime.now());
            }

            log.debug("Information extraction completed for meeting: {}", meetingId);
            return aiExtractionRepository.save(extraction);

        } catch (Exception e) {
            log.error("Information extraction failed for meeting: {}", meetingId, e);
            throw new RuntimeException("Information extraction failed: " + e.getMessage(), e);
        }
    }

    private void generateMeetingMinutes(Meeting meeting, AIExtraction extraction, User user) {
        log.debug("Generating meeting minutes for meeting: {}", meeting.getId());

        try {
            // Generate both PDF and DOCX versions
            String pdfFileId = documentGenerationService.generateMinutesPDF(meeting, extraction, user);
            String docxFileId = documentGenerationService.generateMinutesDOCX(meeting, extraction, user);

            log.debug("Meeting minutes generated - PDF: {}, DOCX: {}", pdfFileId, docxFileId);

        } catch (Exception e) {
            log.error("Document generation failed for meeting: {}", meeting.getId(), e);
            throw new RuntimeException("Document generation failed: " + e.getMessage(), e);
        }
    }

    private void updateMeetingStatus(UUID meetingId, MeetingStatus status, User user) {
        try {
            Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                    .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

            meeting.setStatus(status);

            if (status == MeetingStatus.PROCESSING) {
                meeting.setActualStartTime(LocalDateTime.now());
            } else if (status == MeetingStatus.PROCESSED || status == MeetingStatus.FAILED) {
                meeting.setActualEndTime(LocalDateTime.now());
            }

            meetingRepository.save(meeting);
            log.debug("Meeting status updated to {} for meeting: {}", status, meetingId);

        } catch (Exception e) {
            log.error("Failed to update meeting status for meeting: {}", meetingId, e);
            throw new RuntimeException("Failed to update meeting status: " + e.getMessage(), e);
        }
    }

    public ProcessingStatus getProcessingStatus(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!hasAccessToMeeting(meeting, user)) {
            throw new RuntimeException("Access denied to this meeting");
        }

        return new ProcessingStatus(
                meeting.getStatus(),
                calculateProgress(meeting.getStatus()),
                getCurrentStep(meeting.getStatus()),
                getStatusMessage(meeting.getStatus()),
                meeting.getActualStartTime(),
                meeting.getActualEndTime()
        );
    }

    @Async
    public CompletableFuture<Void> retryProcessing(UUID meetingId, User user) {
        log.info("Retrying processing for failed meeting: {}", meetingId);

        // Reset meeting status to PROCESSING
        updateMeetingStatus(meetingId, MeetingStatus.PROCESSING, user);

        // Restart the processing pipeline
        return processMeeting(meetingId, user);
    }

    private void createActionItemsFromExtraction(Meeting meeting, AIExtraction extraction) {
        if (extraction == null || extraction.getExtractedData() == null) {
            log.warn("No extraction data found for meeting: {}", meeting.getId());
            return;
        }

        try {
            // Get extracted action items from AI extraction
            List<ExtractedData.ExtractedActionItem> extractedActionItems =
                    extraction.getExtractedData().getActionItems();

            if (extractedActionItems == null || extractedActionItems.isEmpty()) {
                log.info("No action items extracted for meeting: {}", meeting.getId());
                return;
            }

            log.info("Creating {} action items for meeting: {}",
                    extractedActionItems.size(), meeting.getId());

            // Convert extracted action items to entities and save to PostgreSQL
            for (ExtractedData.ExtractedActionItem extractedItem : extractedActionItems) {
                com.meetingminutes.backend.entity.ActionItem actionItem =
                        new com.meetingminutes.backend.entity.ActionItem();

                // Map fields from extraction to entity
                actionItem.setDescription(extractedItem.getDescription());
                actionItem.setMeeting(meeting);
                actionItem.setStatus(TaskStatus.PENDING); // Default status

                // Handle assigned user/email
                if (extractedItem.getAssignedTo() != null && !extractedItem.getAssignedTo().trim().isEmpty()) {
                    String assignedTo = extractedItem.getAssignedTo().trim();

                    // Try to parse as email (contains @)
                    if (assignedTo.contains("@")) {
                        // Try to find user by email
                        Optional<User> user = userRepo.findByEmail(assignedTo);
                        if (user.isPresent()) {
                            actionItem.setAssignedToUser(user.get());
                        } else {
                            actionItem.setAssignedToEmail(assignedTo);
                        }
                    } else {
                        // It's probably a name, try to find by name (you might need to implement this)
                        log.debug("Assignee '{}' is not an email, storing as external", assignedTo);
                        actionItem.setAssignedToEmail(assignedTo);
                    }
                }

                // Handle deadline parsing
                if (extractedItem.getDeadline() != null && !extractedItem.getDeadline().trim().isEmpty()) {
                    try {
                        LocalDateTime deadline = parseDeadline(extractedItem.getDeadline());
                        actionItem.setDeadline(deadline);
                    } catch (Exception e) {
                        log.warn("Failed to parse deadline '{}' for action item: {}",
                                extractedItem.getDeadline(), extractedItem.getDescription(), e);
                    }
                }

                // Set priority based on confidence if available
                if (extractedItem.getConfidence() != null) {
                    if (extractedItem.getConfidence() > 0.8) {
                        actionItem.setPriority(3); // High confidence = high priority
                    } else if (extractedItem.getConfidence() > 0.5) {
                        actionItem.setPriority(2); // Medium confidence = medium priority
                    } else {
                        actionItem.setPriority(1); // Low confidence = low priority
                    }
                }

                actionItemRepo.save(actionItem);
                log.debug("Created action item: {}", extractedItem.getDescription());
            }

            log.info("Successfully created {} action items for meeting: {}",
                    extractedActionItems.size(), meeting.getId());

        } catch (Exception e) {
            log.error("Failed to create action items for meeting: {}", meeting.getId(), e);
            throw new RuntimeException("Failed to create action items: " + e.getMessage(), e);
        }
    }

    private LocalDateTime parseDeadline(String deadlineString) {
        if (deadlineString == null || deadlineString.trim().isEmpty()) {
            return null;
        }

        String normalized = deadlineString.trim().toLowerCase();

        try {
            // Try common date formats
            if (normalized.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDateTime.parse(normalized + "T23:59:59");
            } else if (normalized.matches("\\d{1,2}/\\d{1,2}/\\d{4}")) {
                // MM/dd/yyyy format
                String[] parts = normalized.split("/");
                int month = Integer.parseInt(parts[0]);
                int day = Integer.parseInt(parts[1]);
                int year = Integer.parseInt(parts[2]);
                return LocalDateTime.of(year, month, day, 23, 59, 59);
            } else if (normalized.contains("next week")) {
                return LocalDateTime.now().plusWeeks(1);
            } else if (normalized.contains("tomorrow")) {
                return LocalDateTime.now().plusDays(1);
            } else if (normalized.matches("in \\d+ days?")) {
                // "in 5 days" format
                int days = Integer.parseInt(normalized.replaceAll("\\D", ""));
                return LocalDateTime.now().plusDays(days);
            } else {
                log.warn("Unrecognized deadline format: {}", deadlineString);
                return LocalDateTime.now().plusWeeks(1); // Default to 1 week
            }
        } catch (Exception e) {
            log.warn("Failed to parse deadline '{}', using default", deadlineString, e);
            return LocalDateTime.now().plusWeeks(1); // Default to 1 week
        }
    }

    public void cancelProcessing(UUID meetingId, User user) {
        log.info("Cancelling processing for meeting: {}", meetingId);

        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        if (meeting.getStatus() != MeetingStatus.PROCESSING) {
            throw new RuntimeException("Meeting is not currently processing");
        }

        // Update status to indicate cancellation
        meeting.setStatus(MeetingStatus.FAILED);
        meeting.setActualEndTime(LocalDateTime.now());
        meetingRepository.save(meeting);

        log.info("Processing cancelled for meeting: {}", meetingId);
    }

    private String getCurrentStep(MeetingStatus status) {
        return switch (status) {
            case DRAFT -> "WAITING_FOR_PROCESSING";
            case PROCESSING -> "AI_PROCESSING";
            case PROCESSED -> "COMPLETED";
            case FAILED -> "FAILED";
        };
    }

    private String getStatusMessage(MeetingStatus status) {
        return switch (status) {
            case DRAFT -> "Ready for processing - upload audio to start";
            case PROCESSING -> "AI is processing your meeting - this may take a few minutes";
            case PROCESSED -> "Processing completed successfully - minutes are ready";
            case FAILED -> "Processing failed - please try again or contact support";
        };
    }

    private int calculateProgress(MeetingStatus status) {
        return switch (status) {
            case DRAFT -> 0;
            case PROCESSING -> 50; // In progress
            case PROCESSED -> 100; // Completed
            case FAILED -> 0; // Reset on failure
        };
    }

    private boolean hasAccessToMeeting(Meeting meeting, User user) {
        return meeting.getCreatedBy().getId().equals(user.getId());
    }

    public record ProcessingStatus(
            MeetingStatus status,
            int progress,
            String currentStep,
            String message,
            LocalDateTime startedAt,
            LocalDateTime completedAt
    ) {}

    public HealthStatus getAIHealthStatus() {
        try {
            boolean isHealthy = aiServiceClient.isServiceHealthy();
            return new HealthStatus(
                    isHealthy,
                    isHealthy ? "AI service is healthy" : "AI service is unavailable",
                    LocalDateTime.now()
            );
        } catch (Exception e) {
            return new HealthStatus(
                    false,
                    "AI service health check failed: " + e.getMessage(),
                    LocalDateTime.now()
            );
        }
    }

    public record HealthStatus(
            boolean healthy,
            String message,
            LocalDateTime checkedAt
    ) {}
}