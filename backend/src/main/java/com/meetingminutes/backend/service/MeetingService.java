package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.CreateAgendaItemRequest;
import com.meetingminutes.backend.dto.CreateMeetingRequest;
import com.meetingminutes.backend.dto.UpdateMeetingRequest;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.exception.AccessDeniedException;
import com.meetingminutes.backend.exception.EntityNotFoundException;
import com.meetingminutes.backend.exception.ValidationException;
import com.meetingminutes.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final MeetingSeriesRepo meetingSeriesRepo;
    private final UserRepo userRepo;
    private final AgendaItemRepo agendaItemRepo;
    private final AttendeeRepo attendeeRepo;
    private final AgendaService agendaService;
    private final MeetingAccessService meetingAccessService;

    public Meeting createMeeting(CreateMeetingRequest request, User user) {
        // Handling series creation or assignment
        MeetingSeries series = null;
        if (request.getSeriesId() != null) {
            series = meetingSeriesRepo.findById(request.getSeriesId())
                    .orElseThrow(() -> new RuntimeException("Meeting series not found"));
        } else if (request.getNewSeriesTitle() != null) {
            series = createMeetingSeries(request.getNewSeriesTitle(), user);
        }

        Meeting meeting = new Meeting();
        meeting.setTitle(request.getTitle());
        meeting.setDescription(request.getDescription());
        meeting.setAgendaText(request.getAgendaText());
        meeting.setUsePreviousContext(request.getUsePreviousContext());
        meeting.setSeries(series);
        meeting.setCreatedBy(user);
        meeting.setScheduledTime(request.getScheduledTime());
        meeting.setStatus(MeetingStatus.DRAFT);

        Meeting savedMeeting = meetingRepository.save(meeting);

        if (request.getAgendaItems() != null && !request.getAgendaItems().isEmpty()) {
            createAgendaItems(savedMeeting, request.getAgendaItems());
        }

        addOrganizerAsAttendee(savedMeeting, user);

        return savedMeeting;
    }

    public Meeting getMeeting(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!hasAccessToMeeting(meeting, user)) {
            throw new RuntimeException("Access denied to this meeting");
        }

        return meeting;
    }

    public List<Meeting> getUserMeetings(User user) {
        return meetingRepository.findByUserOrAttendee(user,
                PageRequest.of(0, 50, Sort.by("createdAt").descending())).getContent();
    }

    public List<Meeting> getMeetingInSeries(UUID seriesId, User user) {
        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
                .orElseThrow(() -> new RuntimeException("Meeting series not found"));

        if(!series.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to this meeting series");
        }

        return meetingRepository.findBySeriesIdOrderByCreatedAtDesc(seriesId);
    }

    public void deleteMeeting(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        meetingRepository.delete(meeting);
    }

    public Meeting updateMeetingStatus(UUID meetingId, MeetingStatus status, User user) {
        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        meeting.setStatus(status);

        if (status == MeetingStatus.PROCESSING) {
            meeting.setActualStartTime(LocalDateTime.now());
        } else if (status == MeetingStatus.PROCESSED || status == MeetingStatus.FAILED) {
            meeting.setActualEndTime(LocalDateTime.now());
        }

        return meetingRepository.save(meeting);
    }

    private MeetingSeries createMeetingSeries(String title, User user) {
        MeetingSeries series = new MeetingSeries();
        series.setTitle(title);
        series.setCreatedBy(user);
        series.setIsActive(true);
        return meetingSeriesRepo.save(series);
    }

    public Meeting updateAudioFilePath(UUID meetingId, String audioFilePath, User user) {
        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        meeting.setAudioFilePath(audioFilePath);
        return meetingRepository.save(meeting);
    }

    public Meeting updateMeeting(UUID meetingId, UpdateMeetingRequest request, User user) {
        log.info("Updating meeting: {} for user: {}", meetingId, user.getEmail());

        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, user)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found or access denied"));

        // Validate that meeting can be updated (not in processing state)
        if (meeting.getStatus() == MeetingStatus.PROCESSING) {
            throw new ValidationException("Cannot update meeting while processing is in progress");
        }

        // Update basic fields
        if (request.getTitle() != null) {
            meeting.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            meeting.setDescription(request.getDescription());
        }
        if (request.getAgendaText() != null) {
            meeting.setAgendaText(request.getAgendaText());
        }
        if (request.getUsePreviousContext() != null) {
            meeting.setUsePreviousContext(request.getUsePreviousContext());
        }
        if (request.getScheduledTime() != null) {
            meeting.setScheduledTime(request.getScheduledTime());
        }

        // Handle series update
        if (request.getSeriesId() != null || request.getNewSeriesTitle() != null) {
            updateMeetingSeries(meeting, request, user);
        }

        // Handle agenda items if provided
        if (request.getAgendaItems() != null) {
            updateAgendaItems(meeting, request.getAgendaItems());
        }

        Meeting updatedMeeting = meetingRepository.save(meeting);
        log.info("Meeting updated successfully: {}", meetingId);

        return updatedMeeting;
    }

    private void updateMeetingSeries(Meeting meeting, UpdateMeetingRequest request, User user) {
        MeetingSeries series = null;

        if (request.getSeriesId() != null) {
            // Use existing series
            series = meetingSeriesRepo.findById(request.getSeriesId())
                    .orElseThrow(() -> new EntityNotFoundException("Meeting series not found"));

            // Verify user has access to the series
            if (!series.getCreatedBy().getId().equals(user.getId())) {
                throw new AccessDeniedException("Cannot assign meeting to this series");
            }
        } else if (request.getNewSeriesTitle() != null) {
            // Create new series
            series = createMeetingSeries(request.getNewSeriesTitle(), user);
        }

        meeting.setSeries(series);
    }

    private void updateAgendaItems(Meeting meeting, List<CreateAgendaItemRequest> agendaItemRequests) {
        // Delete existing agenda items
        agendaItemRepo.deleteByMeetingId(meeting.getId());

        // Create new agenda items
        if (!agendaItemRequests.isEmpty()) {
            List<AgendaItem> agendaItems = agendaItemRequests.stream()
                    .map(request -> {
                        AgendaItem item = new AgendaItem();
                        item.setMeeting(meeting);
                        item.setTitle(request.getTitle());
                        item.setDescription(request.getDescription());
                        item.setOrderIndex(request.getOrderIndex());
                        return item;
                    })
                    .collect(Collectors.toList());

            agendaItemRepo.saveAll(agendaItems);
            meeting.setAgendaItems(agendaItems);
        }
    }

    private void createAgendaItems(Meeting meeting, List<CreateAgendaItemRequest> agendaItemRequests) {
        if (agendaItemRequests != null && !agendaItemRequests.isEmpty()) {
            agendaService.createAgendaItems(meeting, agendaItemRequests);
        }
    }

    private void addOrganizerAsAttendee(Meeting meeting, User user) {
        Attendee organizer = new Attendee();
        organizer.setMeeting(meeting);
        organizer.setUser(user);
        organizer.setInviteEmail(user.getEmail());
        organizer.setStatus(AttendanceStatus.CONFIRMED);
        organizer.setIsOrganizer(true);
        organizer.setInvitedAt(LocalDateTime.now());

        attendeeRepo.save(organizer);
    }

    private boolean hasAccessToMeeting(Meeting meeting, User user) {
        return meetingAccessService.hasAccessToMeeting(meeting, user);
    }
}
