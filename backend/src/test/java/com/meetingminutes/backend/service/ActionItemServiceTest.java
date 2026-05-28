package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.TaskStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ActionItemServiceTest {

    @Mock
    private ActionItemRepo actionItemRepo;
    @Mock
    private MeetingRepository meetingRepository;
    @Mock
    private UserRepo userRepo;
    @Mock
    private EmailService emailService;
    @Mock
    private MeetingAccessService meetingAccessService;

    @InjectMocks
    private ActionItemService actionItemService;

    private User creator;
    private User assignee;
    private Meeting meeting;
    private ActionItem actionItem;

    @BeforeEach
    void setUp() {
        creator = new User();
        creator.setId(UUID.randomUUID());
        creator.setEmail("creator@example.com");

        assignee = new User();
        assignee.setId(UUID.randomUUID());
        assignee.setEmail("assignee@example.com");

        meeting = new Meeting();
        meeting.setId(UUID.randomUUID());
        meeting.setCreatedBy(creator);

        actionItem = new ActionItem();
        actionItem.setId(UUID.randomUUID());
        actionItem.setMeeting(meeting);
        actionItem.setAssignedToUser(assignee);
        actionItem.setStatus(TaskStatus.PENDING);
    }

    // --- createActionItem Tests ---

    @Test
    void createActionItem_AssignedEmailMatchesUser_UserSetEmailSent() {
        when(meetingRepository.findByIdAndCreatedBy(meeting.getId(), creator)).thenReturn(Optional.of(meeting));
        when(userRepo.findByEmail("assignee@example.com")).thenReturn(Optional.of(assignee));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.createActionItem(meeting.getId(), "Task 1", "assignee@example.com", LocalDateTime.now(), creator);

        assertEquals(TaskStatus.PENDING, result.getStatus());
        assertEquals(assignee, result.getAssignedToUser());
        assertNull(result.getAssignedToEmail());
        verify(emailService).sendTaskAssignmentNotification(result);
    }

    @Test
    void createActionItem_AssignedEmailDoesNotMatch_EmailSetUserNullNoEmailSent() {
        when(meetingRepository.findByIdAndCreatedBy(meeting.getId(), creator)).thenReturn(Optional.of(meeting));
        when(userRepo.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.createActionItem(meeting.getId(), "Task 1", "unknown@example.com", LocalDateTime.now(), creator);

        assertEquals(TaskStatus.PENDING, result.getStatus());
        assertNull(result.getAssignedToUser());
        assertEquals("unknown@example.com", result.getAssignedToEmail());
        verify(emailService, never()).sendTaskAssignmentNotification(any());
    }

    @Test
    void createActionItem_AssignedEmailNull_NeitherSetNoEmailSent() {
        when(meetingRepository.findByIdAndCreatedBy(meeting.getId(), creator)).thenReturn(Optional.of(meeting));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.createActionItem(meeting.getId(), "Task 1", null, LocalDateTime.now(), creator);

        assertEquals(TaskStatus.PENDING, result.getStatus());
        assertNull(result.getAssignedToUser());
        assertNull(result.getAssignedToEmail());
        verify(emailService, never()).sendTaskAssignmentNotification(any());
        verify(userRepo, never()).findByEmail(any());
    }

    @Test
    void createActionItem_MeetingNotFoundOrNotCreator_ThrowsException() {
        when(meetingRepository.findByIdAndCreatedBy(meeting.getId(), creator)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> 
                actionItemService.createActionItem(meeting.getId(), "Task", "email", LocalDateTime.now(), creator));
    }

    // --- updateTaskStatus Tests ---

    @Test
    void updateTaskStatus_AssigneeUpdatesOwnTask_Succeeds() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.updateTaskStatus(actionItem.getId(), TaskStatus.IN_PROGRESS, assignee);

        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
        assertNull(result.getCompletedAt());
    }

    @Test
    void updateTaskStatus_OrganizerUpdatesAnyTask_Succeeds() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.updateTaskStatus(actionItem.getId(), TaskStatus.IN_PROGRESS, creator);

        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    void updateTaskStatus_UnrelatedUser_ThrowsException() {
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));

        Exception exception = assertThrows(RuntimeException.class, () -> 
                actionItemService.updateTaskStatus(actionItem.getId(), TaskStatus.IN_PROGRESS, otherUser));
        assertEquals("Cannot update this task", exception.getMessage());
    }

    @Test
    void updateTaskStatus_StatusCompleted_CompletedAtSet() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.updateTaskStatus(actionItem.getId(), TaskStatus.COMPLETED, assignee);

        assertEquals(TaskStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
    }

    @Test
    void updateTaskStatus_TaskNotFound_ThrowsException() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.empty());

        Exception exception = assertThrows(RuntimeException.class, () -> 
                actionItemService.updateTaskStatus(actionItem.getId(), TaskStatus.IN_PROGRESS, assignee));
        assertEquals("Task not found", exception.getMessage());
    }

    // --- acknowledgeTask Tests ---

    @Test
    void acknowledgeTask_AssigneeAcknowledges_Succeeds() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.acknowledgeTask(actionItem.getId(), assignee);

        assertTrue(result.getAcknowledged());
        assertNotNull(result.getAcknowledgedAt());
    }

    @Test
    void acknowledgeTask_OrganizerAcknowledges_Succeeds() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.acknowledgeTask(actionItem.getId(), creator);

        assertTrue(result.getAcknowledged());
        assertNotNull(result.getAcknowledgedAt());
    }

    @Test
    void acknowledgeTask_UnrelatedUser_ThrowsException() {
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());

        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));

        assertThrows(RuntimeException.class, () -> actionItemService.acknowledgeTask(actionItem.getId(), otherUser));
    }

    // --- reassignTask Tests ---

    @Test
    void reassignTask_OrganizerReassignsToRegisteredUser_UserSetEmailSent() {
        User newAssignee = new User();
        newAssignee.setId(UUID.randomUUID());
        newAssignee.setEmail("new@example.com");

        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(userRepo.findByEmail("new@example.com")).thenReturn(Optional.of(newAssignee));
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.reassignTask(actionItem.getId(), "new@example.com", creator);

        assertEquals(newAssignee, result.getAssignedToUser());
        assertNull(result.getAssignedToEmail());
        verify(emailService).sendTaskAssignmentNotification(result);
    }

    @Test
    void reassignTask_OrganizerReassignsToUnknownEmail_EmailSetUserClearedNoEmailSent() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));
        when(userRepo.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        when(actionItemRepo.save(any(ActionItem.class))).thenAnswer(i -> i.getArgument(0));

        ActionItem result = actionItemService.reassignTask(actionItem.getId(), "unknown@example.com", creator);

        assertNull(result.getAssignedToUser());
        assertEquals("unknown@example.com", result.getAssignedToEmail());
        verify(emailService, never()).sendTaskAssignmentNotification(any());
    }

    @Test
    void reassignTask_NonOrganizerTriesToReassign_ThrowsException() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));

        Exception exception = assertThrows(RuntimeException.class, () -> 
                actionItemService.reassignTask(actionItem.getId(), "new@example.com", assignee));
        assertEquals("Only meeting organizer can reassign tasks", exception.getMessage());
    }

    // --- deleteTask Tests ---

    @Test
    void deleteTask_OrganizerDeletes_Succeeds() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));

        actionItemService.deleteTask(actionItem.getId(), creator);

        verify(actionItemRepo).delete(actionItem);
    }

    @Test
    void deleteTask_NonOrganizerTriesToDelete_ThrowsException() {
        when(actionItemRepo.findById(actionItem.getId())).thenReturn(Optional.of(actionItem));

        assertThrows(RuntimeException.class, () -> actionItemService.deleteTask(actionItem.getId(), assignee));
    }

    // --- getOverdueTasks Tests ---

    @Test
    void getOverdueTasks_ReturnsList() {
        List<ActionItem> expectedList = Collections.singletonList(actionItem);
        when(actionItemRepo.findOverdueActionItemsByUser(eq(creator.getId()), any(LocalDateTime.class))).thenReturn(expectedList);

        List<ActionItem> result = actionItemService.getOverdueTasks(creator);

        assertEquals(expectedList, result);
    }

    // --- getUserTaskCountByStatus Tests ---

    @Test
    void getUserTaskCountByStatus_ReturnsCount() {
        when(actionItemRepo.countByAssignedToUserAndStatus(assignee.getId(), TaskStatus.PENDING)).thenReturn(5L);

        long result = actionItemService.getUserTaskCountByStatus(assignee, TaskStatus.PENDING);

        assertEquals(5L, result);
    }

    @Test
    void getUserTaskCountByStatus_NoTasks_ReturnsZero() {
        when(actionItemRepo.countByAssignedToUserAndStatus(assignee.getId(), TaskStatus.COMPLETED)).thenReturn(0L);

        long result = actionItemService.getUserTaskCountByStatus(assignee, TaskStatus.COMPLETED);

        assertEquals(0L, result);
    }
}
