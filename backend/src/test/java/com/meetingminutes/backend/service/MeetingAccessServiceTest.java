package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.AttendeeRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MeetingAccessServiceTest {

    @Mock
    private AttendeeRepo attendeeRepo;

    @Mock
    private ActionItemRepo actionItemRepo;

    @InjectMocks
    private MeetingAccessService meetingAccessService;

    private User creator;
    private User otherUser;
    private Meeting meeting;

    @BeforeEach
    void setUp() {
        creator = new User();
        creator.setId(UUID.randomUUID());

        otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        meeting = new Meeting();
        meeting.setId(UUID.randomUUID());
        meeting.setCreatedBy(creator);
    }

    @Test
    void hasAccessToMeeting_UserIsCreator_ReturnsTrue() {
        boolean result = meetingAccessService.hasAccessToMeeting(meeting, creator);

        assertTrue(result);
        verify(attendeeRepo, never()).findByMeetingIdAndUserId(any(), any());
        verify(actionItemRepo, never()).existsByMeetingIdAndAssignedToUserId(any(), any());
    }

    @Test
    void hasAccessToMeeting_UserIsAttendee_ReturnsTrue() {
        when(attendeeRepo.findByMeetingIdAndUserId(meeting.getId(), otherUser.getId()))
                .thenReturn(Optional.of(new com.meetingminutes.backend.entity.Attendee()));

        boolean result = meetingAccessService.hasAccessToMeeting(meeting, otherUser);

        assertTrue(result);
        verify(actionItemRepo, never()).existsByMeetingIdAndAssignedToUserId(any(), any());
    }

    @Test
    void hasAccessToMeeting_UserHasAssignedTask_ReturnsTrue() {
        when(attendeeRepo.findByMeetingIdAndUserId(meeting.getId(), otherUser.getId()))
                .thenReturn(Optional.empty());
        when(actionItemRepo.existsByMeetingIdAndAssignedToUserId(meeting.getId(), otherUser.getId()))
                .thenReturn(true);

        boolean result = meetingAccessService.hasAccessToMeeting(meeting, otherUser);

        assertTrue(result);
    }

    @Test
    void hasAccessToMeeting_UserHasNoAccess_ReturnsFalse() {
        when(attendeeRepo.findByMeetingIdAndUserId(meeting.getId(), otherUser.getId()))
                .thenReturn(Optional.empty());
        when(actionItemRepo.existsByMeetingIdAndAssignedToUserId(meeting.getId(), otherUser.getId()))
                .thenReturn(false);

        boolean result = meetingAccessService.hasAccessToMeeting(meeting, otherUser);

        assertFalse(result);
    }
}
