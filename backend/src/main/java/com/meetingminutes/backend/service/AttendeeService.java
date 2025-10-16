package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.InviteParticipantRequest;
import com.meetingminutes.backend.entity.AttendanceStatus;
import com.meetingminutes.backend.entity.Attendee;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.AttendeeRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
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
