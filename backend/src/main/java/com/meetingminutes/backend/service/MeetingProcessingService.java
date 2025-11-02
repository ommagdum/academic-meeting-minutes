package com.meetingminutes.backend.service;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.ExtractedData;
import com.meetingminutes.backend.document.GeneratedDocument;
import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.dto.ai.ExtractionRequest;
import com.meetingminutes.backend.dto.ai.ExtractionResponse;
import com.meetingminutes.backend.dto.ai.TranscriptionResponse;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.exception.ProcessingException;
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
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

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
    private final WebSocketEventPublisher webSocketEventPublisher;

    @Async
    public CompletableFuture<Void> processMeeting(UUID meetingId, User user) {
        log.info("Starting AI processing pipeline for meeting: {}", meetingId);

        Meeting meeting = null; // Declare outside try block
        String audioFilePath = null;

        try {
            meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new ProcessingException("Meeting not found"));

            audioFilePath = meeting.getAudioFilePath();
            if (audioFilePath == null) {
                throw new ProcessingException("No audio file found for this meeting");
            }

            updateMeetingStatus(meetingId, MeetingStatus.PROCESSING, user);

            webSocketEventPublisher.sendProcessingUpdate(meetingId, MeetingStatus.PROCESSING,
                    10, "PREPARING", "Starting audio processing pipeline");

            if (!fileUploadService.isValidFilePath(audioFilePath)) {
                throw new ProcessingException("Audio file not found: " + audioFilePath);
            }

            // Step 1: Transcription
            log.info("Starting transcription for meeting: {}", meetingId);
            webSocketEventPublisher.sendProcessingUpdate(meetingId, MeetingStatus.PROCESSING,
                    25, "TRANSCRIBING", "Converting audio to text using AI");
            Transcript transcript = transcribeAudio(meetingId, audioFilePath);
            validateProcessingStep("transcription", transcript);
            log.info("Transcription completed for meeting: {}", meetingId);

            // Step 2: AI Extraction
            log.info("Starting AI extraction for meeting: {}", meetingId);
            webSocketEventPublisher.sendProcessingUpdate(meetingId, MeetingStatus.PROCESSING,
                    50, "EXTRACTING", "Analyzing content and extracting key information");
            AIExtraction extraction = extractInformation(meetingId, transcript.getRawText());
            validateProcessingStep("extraction", extraction);
            log.info("AI extraction completed for meeting: {}", meetingId);

            // Step 3: Create Action Items
            log.info("Creating action items for meeting: {}", meetingId);
            webSocketEventPublisher.sendProcessingUpdate(meetingId, MeetingStatus.PROCESSING,
                    75, "CREATING_TASKS", "Generating action items and assignments");
            createActionItemsFromExtraction(meeting, extraction);
            log.info("Action items created for meeting: {}", meetingId);

            // Step 4: Document Generation
            log.info("Starting document generation for meeting: {}", meetingId);
            webSocketEventPublisher.sendProcessingUpdate(meetingId, MeetingStatus.PROCESSING,
                    90, "GENERATING_DOCUMENTS", "Creating PDF and DOCX minutes");
            generateMeetingMinutes(meeting, extraction, user);
            log.info("Document generation completed for meeting: {}", meetingId);

            // Finalize processing
            updateMeetingStatus(meetingId, MeetingStatus.PROCESSED, user);
            String documentUrl = documentGenerationService.getDocumentUrl(meetingId);
            int actionItemCount = actionItemRepo.findByMeetingId(meetingId).size();
            webSocketEventPublisher.sendProcessingComplete(meetingId, documentUrl, actionItemCount);
            emailService.sendProcessingCompleteNotification(user, meeting);
            fileUploadService.cleanupTempFile(audioFilePath);

            log.info("AI processing pipeline completed successfully for meeting: {}", meetingId);
            return CompletableFuture.completedFuture(null);

        } catch (Exception e) {
            log.error("AI processing pipeline failed for meeting: {}", meetingId, e);

            if (meetingId != null) {
                webSocketEventPublisher.sendProcessingError(meetingId, "Processing failed: " + e.getMessage());
            }

            updateMeetingStatus(meetingId, MeetingStatus.FAILED, user);

            // Cleanup on failure - use the audioFilePath variable
            if (audioFilePath != null) {
                try {
                    fileUploadService.cleanupTempFile(audioFilePath);
                } catch (Exception cleanupEx) {
                    log.warn("Failed to cleanup temp file on processing failure", cleanupEx);
                }
            }

            return CompletableFuture.failedFuture(e);
        }
    }

    private Transcript transcribeAudio(UUID meetingId, String audioFilePath) {
        log.debug("Transcribing audio for meeting: {}, file: {}", meetingId, audioFilePath);

        // Retry logic with exponential backoff
        int maxAttempts = 3;
        int attempt = 0;
        long backoffDelay = 1000; // 1 second initial delay

        while (attempt < maxAttempts) {
            try {
                attempt++;
                log.debug("Transcription attempt {}/{} for meeting: {}", attempt, maxAttempts, meetingId);

                TranscriptionResponse response = aiServiceClient.transcribeAudio(audioFilePath, meetingId);

                if (response == null || !response.isSuccess()) {
                    throw new ProcessingException("Transcription service returned unsuccessful response");
                }

                // ✅ FIX: Check if transcript already exists and update it
                Optional<Transcript> existingTranscript = transcriptRepository.findByMeetingId(meetingId);
                Transcript transcript;

                if (existingTranscript.isPresent()) {
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
                log.warn("Transcription attempt {}/{} failed for meeting: {}", attempt, maxAttempts, meetingId, e);

                if (attempt == maxAttempts) {
                    log.error("All transcription attempts failed for meeting: {}", meetingId, e);
                    throw new ProcessingException("Transcription failed after " + maxAttempts + " attempts: " + e.getMessage(), e);
                }

                // Exponential backoff
                try {
                    Thread.sleep(backoffDelay);
                    backoffDelay *= 2; // Double the delay for next attempt
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new ProcessingException("Transcription interrupted", ie);
                }
            }
        }

        throw new ProcessingException("Unexpected error in transcription");
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

            if (meeting.getUsePreviousContext() && meeting.getSeries() != null) {
                Map<String, Object> previousContext = getPreviousContext(meeting);
                if (previousContext != null) {
                    extractionRequest.setPreviousContext(previousContext);
                    log.debug("Added previous context for meeting: {}", meetingId);
                }
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
                calculateRealProgress(meeting), // ✅ Use real progress calculation
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
            List<ExtractedData.ExtractedActionItem> extractedActionItems =
                    extraction.getExtractedData().getActionItems();

            if (extractedActionItems == null || extractedActionItems.isEmpty()) {
                log.info("No action items extracted for meeting: {}", meeting.getId());
                return;
            }

            log.info("Creating {} action items for meeting: {}",
                    extractedActionItems.size(), meeting.getId());

            for (ExtractedData.ExtractedActionItem extractedItem : extractedActionItems) {
                com.meetingminutes.backend.entity.ActionItem actionItem =
                        new com.meetingminutes.backend.entity.ActionItem();

                actionItem.setDescription(extractedItem.getDescription());
                actionItem.setMeeting(meeting);
                actionItem.setStatus(TaskStatus.PENDING);

                // ✅ IMPROVED: Enhanced assignment logic
                User assignedUser = resolveAssignee(extractedItem.getAssignedTo(), meeting);
                if (assignedUser != null) {
                    actionItem.setAssignedToUser(assignedUser);
                    log.debug("Assigned action item to user: {}", assignedUser.getEmail());
                } else if (extractedItem.getAssignedTo() != null && !extractedItem.getAssignedTo().trim().isEmpty()) {
                    actionItem.setAssignedToEmail(extractedItem.getAssignedTo().trim());
                    log.debug("Assigned action item to external: {}", extractedItem.getAssignedTo());
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
                    actionItem.setPriority(calculatePriority(extractedItem.getConfidence()));
                }

                actionItemRepo.save(actionItem);
                log.debug("Created action item: {}", extractedItem.getDescription());
            }

            log.info("Successfully created {} action items for meeting: {}",
                    extractedActionItems.size(), meeting.getId());

        } catch (Exception e) {
            log.error("Failed to create action items for meeting: {}", meeting.getId(), e);
            throw new ProcessingException("Failed to create action items: " + e.getMessage(), e);
        }
    }

    private User resolveAssignee(String assignedTo, Meeting meeting) {
        if (assignedTo == null || assignedTo.trim().isEmpty()) {
            return null;
        }

        String normalizedAssignee = assignedTo.trim();

        // 1. Try exact email match
        Optional<User> byEmail = userRepo.findByEmail(normalizedAssignee);
        if (byEmail.isPresent()) {
            return byEmail.get();
        }

        // 2. Try name matching with meeting attendees
        if (meeting.getAttendees() != null) {
            return meeting.getAttendees().stream()
                    .map(Attendee::getUser)
                    .filter(user -> user != null &&
                            (user.getName().equalsIgnoreCase(normalizedAssignee) ||
                                    user.getEmail().equalsIgnoreCase(normalizedAssignee)))
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }

    private int calculatePriority(Double confidence) {
        if (confidence == null) return 2; // Default medium priority

        if (confidence > 0.8) return 3; // High confidence = high priority
        if (confidence > 0.5) return 2; // Medium confidence = medium priority
        return 1; // Low confidence = low priority
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
                String[] parts = normalized.split("/");
                int month = Integer.parseInt(parts[0]);
                int day = Integer.parseInt(parts[1]);
                int year = Integer.parseInt(parts[2]);
                return LocalDateTime.of(year, month, day, 23, 59, 59);
            } else if (normalized.matches("\\d{1,2}-\\d{1,2}-\\d{4}")) {
                String[] parts = normalized.split("-");
                int month = Integer.parseInt(parts[0]);
                int day = Integer.parseInt(parts[1]);
                int year = Integer.parseInt(parts[2]);
                return LocalDateTime.of(year, month, day, 23, 59, 59);
            }
            // Natural language dates
            else if (normalized.contains("next week")) {
                return LocalDateTime.now().plusWeeks(1).withHour(23).withMinute(59).withSecond(59);
            } else if (normalized.contains("tomorrow")) {
                return LocalDateTime.now().plusDays(1).withHour(23).withMinute(59).withSecond(59);
            } else if (normalized.matches("in \\d+ days?")) {
                int days = Integer.parseInt(normalized.replaceAll("\\D", ""));
                return LocalDateTime.now().plusDays(days).withHour(23).withMinute(59).withSecond(59);
            } else if (normalized.contains("end of month")) {
                LocalDateTime endOfMonth = LocalDateTime.now().withDayOfMonth(1).plusMonths(1).minusDays(1);
                return endOfMonth.withHour(23).withMinute(59).withSecond(59);
            } else if (normalized.contains("end of week")) {
                LocalDateTime now = LocalDateTime.now();
                int daysUntilSunday = 7 - now.getDayOfWeek().getValue();
                return now.plusDays(daysUntilSunday).withHour(23).withMinute(59).withSecond(59);
            } else {
                log.warn("Unrecognized deadline format: {}", deadlineString);
                return LocalDateTime.now().plusWeeks(1).withHour(23).withMinute(59).withSecond(59);
            }
        } catch (Exception e) {
            log.warn("Failed to parse deadline '{}', using default", deadlineString, e);
            return LocalDateTime.now().plusWeeks(1).withHour(23).withMinute(59).withSecond(59);
        }
    }

    private void validateProcessingStep(String step, Object result) {
        if (result == null) {
            throw new ProcessingException("Processing step failed: " + step);
        }

        // Step-specific validations
        switch (step) {
            case "transcription":
                Transcript transcript = (Transcript) result;
                if (transcript.getRawText() == null || transcript.getRawText().isBlank()) {
                    throw new ProcessingException("Transcription produced empty text");
                }
                if (transcript.getRawText().length() < 10) {
                    log.warn("Transcription seems very short: {} characters", transcript.getRawText().length());
                }
                break;

            case "extraction":
                AIExtraction extraction = (AIExtraction) result;
                if (!extraction.isSuccess()) {
                    throw new ProcessingException("AI extraction was not successful");
                }
                break;

            case "document_generation":
                // For document generation, we just check that it completed without exception
                log.debug("Document generation validation passed");
                break;
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

    private Map<String, Object> getPreviousContext(Meeting meeting) {
        if (!meeting.getUsePreviousContext() || meeting.getSeries() == null) {
            return null;
        }

        try {
            List<Meeting> previousMeetings = meetingRepository.findProcessedMeetingsInSeries(
                    meeting.getSeries().getId()
            );

            if (previousMeetings.isEmpty()) {
                log.debug("No previous processed meetings found for series: {}", meeting.getSeries().getId());
                return null;
            }

            // Limit to last 3 meetings for context
            List<Map<String, Object>> previousContexts = previousMeetings.stream()
                    .limit(3)
                    .map(this::extractMeetingContext)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            Map<String, Object> context = new HashMap<>();
            context.put("previous_meetings", previousContexts);
            context.put("total_previous_meetings", previousMeetings.size());
            context.put("series_title", meeting.getSeries().getTitle());

            log.debug("Found {} previous meetings for context", previousContexts.size());
            return context;

        } catch (Exception e) {
            log.warn("Failed to fetch previous context for meeting: {}", meeting.getId(), e);
            return null;
        }
    }

    private Map<String, Object> extractMeetingContext(Meeting previousMeeting) {
        try {
            Map<String, Object> context = new HashMap<>();
            context.put("meeting_id", previousMeeting.getId());
            context.put("title", previousMeeting.getTitle());
            context.put("date", previousMeeting.getScheduledTime());

            // Get AI extraction for decisions and action items
            Optional<AIExtraction> extraction = aiExtractionRepository.findByMeetingId(previousMeeting.getId());
            if (extraction.isPresent() && extraction.get().getExtractedData() != null) {
                ExtractedData data = extraction.get().getExtractedData();

                if (data.getDecisions() != null && !data.getDecisions().isEmpty()) {
                    context.put("decisions", data.getDecisions().stream()
                            .map(d -> Map.of(
                                    "topic", d.getTopic(),
                                    "decision", d.getDecision()
                            ))
                            .collect(Collectors.toList()));
                }

                if (data.getActionItems() != null && !data.getActionItems().isEmpty()) {
                    context.put("action_items", data.getActionItems().stream()
                            .map(ai -> Map.of(
                                    "description", ai.getDescription(),
                                    "assigned_to", ai.getAssignedTo(),
                                    "status", "previous" // Mark as from previous meeting
                            ))
                            .collect(Collectors.toList()));
                }
            }

            return context;
        } catch (Exception e) {
            log.warn("Failed to extract context from meeting: {}", previousMeeting.getId(), e);
            return null;
        }
    }

    private int calculateRealProgress(Meeting meeting) {
        boolean transcriptionDone = transcriptRepository.findByMeetingId(meeting.getId()).isPresent();
        boolean extractionDone = aiExtractionRepository.findByMeetingId(meeting.getId()).isPresent();
        boolean documentsGenerated = hasGeneratedDocuments(meeting.getId());
        boolean actionItemsCreated = !actionItemRepo.findByMeetingId(meeting.getId()).isEmpty();

        if (!transcriptionDone) return 25;
        if (!extractionDone) return 50;
        if (!actionItemsCreated) return 75;
        if (!documentsGenerated) return 90;
        return 100;
    }

    private boolean hasGeneratedDocuments(UUID meetingId) {
        List<GeneratedDocument> documents = documentGenerationService.getMeetingDocuments(meetingId);
        return documents != null && !documents.isEmpty();
    }
}