package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.AttendeeRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MeetingAccessService {
    private final AttendeeRepo attendeeRepo;
    private final ActionItemRepo actionItemRepo;

    public boolean hasAccessToMeeting(Meeting meeting, User user) {
        // 1. Creator always has access
        if (meeting.getCreatedBy().getId().equals(user.getId())) {
            return true;
        }

        // 2. Check if user is attendee
        boolean isAttendee = attendeeRepo.findByMeetingIdAndUserId(meeting.getId(), user.getId()).isPresent();
        if (isAttendee) {
            return true;
        }

        // 3. Check if user is assigned to any action item
        boolean hasAssignedTask = actionItemRepo.findByMeetingId(meeting.getId()).stream()
                .anyMatch(task -> task.getAssignedToUser() != null &&
                        task.getAssignedToUser().getId().equals(user.getId()));

        return hasAssignedTask;
    }
}
