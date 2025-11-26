package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.*;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.exception.AccessDeniedException;
import com.meetingminutes.backend.exception.EntityNotFoundException;
import com.meetingminutes.backend.repository.AttendeeRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class AttendeeService {

    private final AttendeeRepo attendeeRepo;
    private final MeetingRepository meetingRepository;
    private final UserRepo userRepo;
    private final EmailService emailService;

    public List<Attendee> inviteParticipants(UUID meetingId, InviteParticipantRequest request, User inviter) {
        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, inviter)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        List<Attendee> invitedAttendees = new ArrayList<>();

        for(String email : request.getEmails()) {
            if (attendeeRepo.existsByMeetingIdAndInviteEmail(meetingId, email)) {
                continue; // Skip if already invited
            }

            Attendee attendee = new Attendee();
            attendee.setMeeting(meeting);
            attendee.setInviteEmail(email);
            attendee.setStatus(AttendanceStatus.INVITED);
            attendee.setInviteToken(generateInviteToken());
            attendee.setInvitedAt(LocalDateTime.now());

            // Check if user exists in system
            Optional<User> existingUser = userRepo.findByEmail(email);
            if (existingUser.isPresent()) {
                attendee.setUser(existingUser.get());
            }

            Attendee savedAttendee = attendeeRepo.save(attendee);
            invitedAttendees.add(savedAttendee);

            emailService.sendMeetingInvitation(meeting, email, attendee.getInviteToken(), request.getMessage());
        }

        return invitedAttendees;
    }

    public TokenValidationResponse validateInvitationToken(String token) {
        try {
            Attendee attendee = attendeeRepo.findByInviteToken(token)
                    .orElseThrow(() -> new EntityNotFoundException("Invalid invitation token"));

            Meeting meeting = attendee.getMeeting();

            // Check if meeting is still accessible
            if (meeting.getStatus() == MeetingStatus.FAILED) {
                return TokenValidationResponse.builder()
                        .valid(false)
                        .message("This meeting has been cancelled")
                        .build();
            }

            // Check if token is already used but allow re-joining
            boolean canJoin = attendee.getStatus() == AttendanceStatus.INVITED ||
                    attendee.getStatus() == AttendanceStatus.CONFIRMED;

            return TokenValidationResponse.builder()
                    .valid(canJoin)
                    .message(canJoin ? "Valid invitation" : "Already responded to this invitation")
                    .meetingTitle(meeting.getTitle())
                    .organizerName(meeting.getCreatedBy().getName())
                    .build();

        } catch (EntityNotFoundException e) {
            return TokenValidationResponse.builder()
                    .valid(false)
                    .message("Invalid or expired invitation token")
                    .build();
        }
    }

    public MeetingDetailsFromToken getMeetingDetailsFromToken(String token) {
        Attendee attendee = attendeeRepo.findByInviteToken(token)
                .orElseThrow(() -> new EntityNotFoundException("Invalid invitation token"));

        Meeting meeting = attendee.getMeeting();
        User organizer = meeting.getCreatedBy();

        return MeetingDetailsFromToken.builder()
                .meetingId(meeting.getId())
                .meetingTitle(meeting.getTitle())
                .meetingDescription(meeting.getDescription())
                .organizerName(organizer.getName())
                .organizerEmail(organizer.getEmail())
                .scheduledTime(meeting.getScheduledTime())
                .requiresAuthentication(attendee.getUser() != null) // If user was specified, requires auth
                .build();
    }

    @Transactional
    public void linkAttendeeToUser(String email, User user) {
        log.info("Linking attendee records for email: {} to user: {}", email, user.getEmail());

        // Find all attendee records with this email that don't have a user assigned
        List<Attendee> attendees = attendeeRepo.findByInviteEmailAndUserIsNull(email);

        log.info("Found {} attendee records to link for email: {}", attendees.size(), email);

        for (Attendee attendee : attendees) {
            log.info("Linking attendee {} (meeting: {}) to user {}",
                    attendee.getId(),
                    attendee.getMeeting().getTitle(),
                    user.getId());
            attendee.setUser(user);
            attendeeRepo.save(attendee);
        }

        log.info("Successfully linked {} attendee records for user: {}", attendees.size(), user.getEmail());
    }

    public Attendee updateAttendanceStatus(UUID attendeeId, AttendanceStatus status, User user) {
        Attendee attendee = attendeeRepo.findById(attendeeId)
                .orElseThrow(() -> new RuntimeException("Attendee not found"));

        if (!canUserUpdateAttendee(attendee, user)) {
            throw new RuntimeException("Access denied to update attendee status");
        }

        attendee.setStatus(status);
        attendee.setRespondedAt(LocalDateTime.now());

        if(status == AttendanceStatus.ATTENDED) {
            attendee.setJoinedAt(LocalDateTime.now());
        }

        return attendeeRepo.save(attendee);
    }

    public PaginatedAttendeeResponse getMeetingAttendeesWithPagination(
            UUID meetingId,
            User user,
            int page,
            int size,
            AttendanceStatus status) {

        log.debug("Fetching paginated attendees for meeting: {}, page: {}, size: {}, status: {}",
                meetingId, page, size, status);

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new EntityNotFoundException("Meeting not found"));

        // Check if user has access to the meeting
        if (!hasAccessToMeeting(meeting, user)) {
            throw new AccessDeniedException("Access denied to meeting attendees");
        }

        // Create pageable with sorting
        Pageable pageable = PageRequest.of(page, size);

        // Get paginated attendees
        Page<Attendee> attendeesPage = attendeeRepo.findByMeetingIdWithPagination(meetingId, status, pageable);

        // Convert to response DTOs
        List<AttendeeDetailResponse> attendeeResponses = attendeesPage.getContent()
                .stream()
                .map(AttendeeDetailResponse::from)
                .collect(Collectors.toList());

        return PaginatedAttendeeResponse.from(
                attendeeResponses,
                page,
                size,
                attendeesPage.getTotalElements()
        );
    }

    public Attendee joinMeetingByToken(String inviteToken, User user) {
        Attendee attendee = attendeeRepo.findByInviteToken(inviteToken)
                .orElseThrow(() -> new RuntimeException("Invalid invitation token"));

        if(user != null) {
            attendee.setUser(user);
            attendee.setInviteEmail(user.getEmail());
        }

        attendee.setStatus(AttendanceStatus.CONFIRMED);
        attendee.setRespondedAt(LocalDateTime.now());

        return attendeeRepo.save(attendee);
    }

    public List<Attendee> getMeetingAttendees(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if(!hasAccessToMeeting(meeting, user)) {
            throw new RuntimeException("Access denied to meeting attendees");
        }

        return attendeeRepo.findByMeetingId(meetingId);
    }

    public void removeAttendee(UUID attendeeId, User user) {
        Attendee attendee = attendeeRepo.findById(attendeeId)
                .orElseThrow(() -> new RuntimeException("Attendee not found"));

        Meeting meeting = attendee.getMeeting();

        if((!meeting.getCreatedBy().getId().equals(user.getId())) &&
                (!(attendee.getUser() != null && attendee.getUser().getId().equals(user.getId())))) {
            throw new RuntimeException("Access denied to remove attendee");
        }

        if(attendee.getIsOrganizer()) {
            throw new RuntimeException("Cannot remove organizer");
        }

        attendeeRepo.delete(attendee);
    }

    public List<Attendee> getUserAttendances(User user) {
        return attendeeRepo.findByUserId(user.getId());
    }

    public List<Attendee> getUserAttendancesByStatus(User user, AttendanceStatus status) {
        return attendeeRepo.findByUserIdAndStatus(user.getId(), status);
    }

    private String generateInviteToken() {
        return UUID.randomUUID().toString().replace("-","").substring(0, 16);
    }

    private boolean hasAccessToMeeting(Meeting meeting, User user) {
        if(meeting.getCreatedBy().getId().equals(user.getId())) {
            return true;
        }

        return attendeeRepo.findByMeetingIdAndUserId(meeting.getId(), user.getId()).isPresent();
    }

    private boolean canUserUpdateAttendee(Attendee attendee, User user) {
        if (attendee.getUser() != null && attendee.getUser().getId().equals(user.getId())) {
            return true;
        }

        Meeting meeting = attendee.getMeeting();
        return meeting.getCreatedBy().getId().equals(user.getId());
    }
}
