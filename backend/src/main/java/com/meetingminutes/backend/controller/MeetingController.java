package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.dto.*;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.AgendaItemRepo;
import com.meetingminutes.backend.repository.AttendeeRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import com.meetingminutes.backend.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
@Slf4j
public class MeetingController {

    private final MeetingService meetingService;
    private final MeetingProcessingService meetingProcessingService;
    private final FileUploadService fileUploadService;
    private final AttendeeService attendeeService;
    private final ActionItemService actionItemService;
    private final DocumentGenerationService documentGenerationService;
    private final UserService userService;
    private final AgendaItemRepo agendaItemRepo;
    private final AttendeeRepo attendeeRepo;
    private final ActionItemRepo actionItemRepo;
    private final TranscriptRepository transcriptRepository;
    private final AIExtractionRepository aiExtractionRepository;
    private final MeetingRepository meetingRepository;

    @Value("${app.upload.max-file-size:524288000}")
    private long maxFileSize;

    @PostMapping
    public ResponseEntity<MeetingDetailResponse> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request,
            Authentication authentication
            ) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.info("Creating new meeting for user: {}, title: {}", user.getEmail(), request.getTitle());

        Meeting meeting = meetingService.createMeeting(request, user);
        MeetingDetailResponse response = convertToDetailResponse(meeting);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{meetingId}")
    public ResponseEntity<MeetingDetailResponse> getMeeting(
            @PathVariable UUID meetingId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.debug("Fetching meeting: {} for user: {}", meetingId, user.getEmail());

        Meeting meeting = meetingService.getMeeting(meetingId, user);

        // Fetch all related data
        List<AgendaItem> agendaItems = agendaItemRepo.findByMeetingIdOrderByOrderIndexAsc(meetingId);
        List<Attendee> attendees = attendeeRepo.findByMeetingId(meetingId);
        List<ActionItem> actionItems = actionItemRepo.findByMeetingIdOrderByCreatedAtAsc(meetingId);

        // Fetch MongoDB data
        Optional<Transcript> transcript = transcriptRepository.findByMeetingId(meetingId);
        Optional<AIExtraction> aiExtraction = aiExtractionRepository.findByMeetingId(meetingId);

        // Fetch document URL (you'll need to implement this)
        String minutesDocumentUrl = documentGenerationService.getDocumentUrl(meetingId);

        MeetingDetailResponse response = convertToDetailResponse(
                meeting, agendaItems, attendees, actionItems,
                transcript.orElse(null), aiExtraction.orElse(null), minutesDocumentUrl
        );

        return ResponseEntity.ok(response);
    }

    private MeetingDetailResponse convertToDetailResponse(
            Meeting meeting,
            List<AgendaItem> agendaItems,
            List<Attendee> attendees,
            List<ActionItem> actionItems,
            Transcript transcript,
            AIExtraction aiExtraction,
            String minutesDocumentUrl) {

        return MeetingDetailResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .agendaText(meeting.getAgendaText())
                .status(meeting.getStatus())
                .scheduledTime(meeting.getScheduledTime())
                .actualStartTime(meeting.getActualStartTime())
                .actualEndTime(meeting.getActualEndTime())
                .usePreviousContext(meeting.getUsePreviousContext())
                .createdBy(UserResponse.from(meeting.getCreatedBy()))
                .series(MeetingSeriesResponse.simpleFrom(meeting.getSeries()))

                // Populate the previously null fields
                .agendaItems(agendaItems != null ?
                        agendaItems.stream()
                                .map(AgendaItemResponse::from)
                                .collect(Collectors.toList())
                        : null)
                .attendees(attendees != null ?
                        attendees.stream()
                                .map(AttendeeResponse::from)
                                .collect(Collectors.toList())
                        : null)
                .actionItems(actionItems != null ?
                        actionItems.stream()
                                .map(ActionItemResponse::from)
                                .collect(Collectors.toList())
                        : null)
                .transcriptId(transcript != null ? transcript.getId() : null)
                .aiExtractionId(aiExtraction != null ? aiExtraction.getId() : null)
                .minutesDocumentUrl(minutesDocumentUrl)

                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .build();
    }

    @GetMapping
    public ResponseEntity<PaginatedResponse<MeetingSummaryResponse>> getUserMeetings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.debug("Fetching meetings for user: {}, page: {}, size: {}", user.getEmail(), page, size);

        Sort sort = direction.equalsIgnoreCase("desc") ?
                Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        // Use repository with proper pagination
        Page<Meeting> meetingsPage = meetingRepository.findByCreatedByOrderByCreatedAtDesc(user, pageable);

        List<MeetingSummaryResponse> summaryResponses = meetingsPage.getContent().stream()
                .map(this::convertToSummaryResponse)
                .toList();

        PaginatedResponse<MeetingSummaryResponse> response = PaginatedResponse.<MeetingSummaryResponse>builder()
                .data(summaryResponses)
                .page(page)
                .size(size)
                .totalElements(meetingsPage.getTotalElements())
                .totalPages(meetingsPage.getTotalPages())
                .last(meetingsPage.isLast())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/{meetingId}/upload-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AudioUploadResponse> uploadAudio(
            @PathVariable UUID meetingId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        User user = getUserFromAuthentication(authentication);
        log.info("Uploading audio for meeting: {}, user: {}, file: {}, size: {}",
                meetingId, user.getEmail(), file.getOriginalFilename(), file.getSize());

        try {
            // Validate file size before processing
            if (file.getSize() > maxFileSize) {
                throw new RuntimeException(
                        String.format("File size too large. Maximum allowed: %dMB", maxFileSize / (1024 * 1024))
                );
            }

            // Upload file to temporary storage
            String filePath = fileUploadService.uploadAudioFile(file, meetingId);

            meetingService.updateAudioFilePath(meetingId, filePath, user);

            meetingService.updateMeetingStatus(meetingId, MeetingStatus.DRAFT, user);

            AudioUploadResponse response = AudioUploadResponse.builder()
                    .success(true)
                    .message("Audio file uploaded successfully")
                    .filePath(filePath)
                    .fileSize(fileUploadService.getFileSizeReadable(file.getSize()))
                    .fileName(file.getOriginalFilename())
                    .meetingId(meetingId)
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Audio upload failed for meeting: {}", meetingId, e);

            AudioUploadResponse response = AudioUploadResponse.builder()
                    .success(false)
                    .message("Audio upload failed: " + e.getMessage())
                    .meetingId(meetingId)
                    .fileName(file.getOriginalFilename())
                    .fileSize(fileUploadService.getFileSizeReadable(file.getSize()))
                    .build();

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/{meetingId}/process")
    public ResponseEntity<ProcessingResponse> startProcessing(
            @PathVariable UUID meetingId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.info("Starting processing for meeting: {}, user: {}", meetingId, user.getEmail());

        try {
            // Start async processing - no file path needed, it's stored in the meeting
            CompletableFuture<Void> processingFuture = meetingProcessingService.processMeeting(meetingId, user);

            ProcessingResponse response = ProcessingResponse.builder()
                    .success(true)
                    .message("Meeting processing started successfully")
                    .meetingId(meetingId)
                    .processingStarted(true)
                    .estimatedTimeMinutes(5) // Estimated processing time
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to start processing for meeting: {}", meetingId, e);

            ProcessingResponse response = ProcessingResponse.builder()
                    .success(false)
                    .message("Failed to start processing: " + e.getMessage())
                    .meetingId(meetingId)
                    .build();

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{meetingId}/processing-status")
    public ResponseEntity<ProcessingStatusResponse> getProcessingStatus(
            @PathVariable UUID meetingId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.debug("Getting processing status for meeting: {}, user: {}", meetingId, user.getEmail());

        try {
            var status = meetingProcessingService.getProcessingStatus(meetingId, user);

            ProcessingStatusResponse response = ProcessingStatusResponse.builder()
                    .meetingId(meetingId)
                    .status(status.status())
                    .progress(status.progress())
                    .currentStep(status.currentStep())
                    .message(status.message())
                    .startedAt(status.startedAt())
                    .completedAt(status.completedAt())
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get processing status for meeting: {}", meetingId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/{meetingId}/invite")
    public ResponseEntity<ApiResponse> inviteParticipants(
            @PathVariable UUID meetingId,
            @Valid @RequestBody InviteParticipantRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.info("Inviting participants to meeting: {}, emails: {}", meetingId, request.getEmails());

        try {
            // ✅ FIX: Pass request directly, not cast
            attendeeService.inviteParticipants(meetingId, request, user);

            ApiResponse response = ApiResponse.builder()
                    .success(true)
                    .message("Participants invited successfully")
                    .data(Map.of("invitedCount", request.getEmails().size()))
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to invite participants for meeting: {}", meetingId, e);

            ApiResponse response = ApiResponse.builder()
                    .success(false)
                    .message("Failed to invite participants: " + e.getMessage())
                    .build();

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }


    @GetMapping("/{meetingId}/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID meetingId,
            @PathVariable String documentId,
            @RequestParam(defaultValue = "pdf") String format,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.info("Downloading document for meeting: {}, document: {}, format: {}",
                meetingId, documentId, format);

        try {
            // This would retrieve the document from GridFS
            // For now, returning a placeholder response
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();

        } catch (Exception e) {
            log.error("Failed to download document for meeting: {}", meetingId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{meetingId}/action-items")
    public ResponseEntity<List<ActionItemResponse>> getMeetingActionItems(
            @PathVariable UUID meetingId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.debug("Fetching action items for meeting: {}, user: {}", meetingId, user.getEmail());

        try {
            var actionItems = actionItemService.getMeetingActionItems(meetingId, user);
            var responses = actionItems.stream()
                    .map(this::convertToActionItemResponse)
                    .toList();

            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            log.error("Failed to fetch action items for meeting: {}", meetingId, e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @DeleteMapping("/{meetingId}")
    public ResponseEntity<ApiResponse> deleteMeeting(
            @PathVariable UUID meetingId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        log.info("Deleting meeting: {}, user: {}", meetingId, user.getEmail());

        try {
            meetingService.deleteMeeting(meetingId, user);

            ApiResponse response = ApiResponse.builder()
                    .success(true)
                    .message("Meeting deleted successfully")
                    .build();

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to delete meeting: {}", meetingId, e);

            ApiResponse response = ApiResponse.builder()
                    .success(false)
                    .message("Failed to delete meeting: " + e.getMessage())
                    .build();

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    private MeetingDetailResponse convertToDetailResponse(Meeting meeting) {
        return MeetingDetailResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .agendaText(meeting.getAgendaText())
                .status(meeting.getStatus())
                .scheduledTime(meeting.getScheduledTime())
                .actualStartTime(meeting.getActualStartTime())
                .actualEndTime(meeting.getActualEndTime())
                .usePreviousContext(meeting.getUsePreviousContext())
                .createdBy(UserResponse.from(meeting.getCreatedBy()))
                .series(MeetingSeriesResponse.simpleFrom(meeting.getSeries())) // Use simpleFrom to avoid lazy loading
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .build();
    }

    private MeetingSummaryResponse convertToSummaryResponse(Meeting meeting) {
        if (meeting == null) {
            return null;
        }

        // Use repository queries for accurate counts (optional)
        int attendeeCount = attendeeRepo.findByMeetingId(meeting.getId()).size();
        int agendaItemCount = agendaItemRepo.findByMeetingIdOrderByOrderIndexAsc(meeting.getId()).size();
        int actionItemCount = actionItemRepo.findByMeetingId(meeting.getId()).size();

        return MeetingSummaryResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .description(meeting.getDescription())
                .status(meeting.getStatus())
                .scheduledTime(meeting.getScheduledTime())
                .actualStartTime(meeting.getActualStartTime())
                .actualEndTime(meeting.getActualEndTime())
                .createdBy(UserResponse.from(meeting.getCreatedBy()))
                .seriesId(meeting.getSeries() != null ? meeting.getSeries().getId() : null)
                .seriesTitle(meeting.getSeries() != null ? meeting.getSeries().getTitle() : null)
                .createdAt(meeting.getCreatedAt())
                .updatedAt(meeting.getUpdatedAt())
                .attendeeCount(attendeeCount)
                .agendaItemCount(agendaItemCount)
                .actionItemCount(actionItemCount)
                .build();
    }

    private ActionItemResponse convertToActionItemResponse(com.meetingminutes.backend.entity.ActionItem actionItem) {
        return ActionItemResponse.from(actionItem);
    }

    private String getAudioFilePathForMeeting(UUID meetingId) {
        // This would retrieve the actual file path from the database
        // For now, return a placeholder - in real implementation,
        // we'd store the file path when uploading
        return "/tmp/uploads/" + meetingId + "_audio.mp3";
    }

    private User getUserFromAuthentication(Authentication authentication) {
        String email = authentication.getName();
        return userService.findByEmail(email);
    }


}
