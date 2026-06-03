package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.request.CreateActionItemRequest;
import com.meetingminutes.backend.dto.request.UpdateActionItemRequest;
import com.meetingminutes.backend.dto.ActionItemResponse;
import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.TaskStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.entity.AuthProvider;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for HITL (Human-in-the-Loop) features:
 * - Publishing AI-generated DRAFT action items
 * - Creating manual action items by organizer
 * - Updating action item details (organizer only)
 * - Deleting action items (organizer only)
 */
@ExtendWith(MockitoExtension.class)
public class HumanInTheLoopServiceTest {

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

    private User organizer;
    private User assignee;
    private User outsider;
    private Meeting meeting;
    private ActionItem draftItem;
    private ActionItem pendingItem;

    @BeforeEach
    void setUp() {
        organizer = new User();
        organizer.setId(UUID.randomUUID());
        organizer.setEmail("organizer@example.com");
        organizer.setName("Organizer");
        organizer.setRole(UserRole.OWNER);

        assignee = new User();
        assignee.setId(UUID.randomUUID());
        assignee.setEmail("assignee@example.com");
        assignee.setName("Assignee");

        outsider = new User();
        outsider.setId(UUID.randomUUID());
        outsider.setEmail("outsider@example.com");

        meeting = new Meeting();
        meeting.setId(UUID.randomUUID());
        meeting.setTitle("HITL Test Meeting");
        meeting.setCreatedBy(organizer);

        draftItem = new ActionItem();
        draftItem.setId(UUID.randomUUID());
        draftItem.setMeeting(meeting);
        draftItem.setDescription("AI-generated task");
        draftItem.setStatus(TaskStatus.DRAFT);
        draftItem.setAiGenerated(true);
        draftItem.setAssignedToUser(assignee);

        pendingItem = new ActionItem();
        pendingItem.setId(UUID.randomUUID());
        pendingItem.setMeeting(meeting);
        pendingItem.setDescription("Already-pending task");
        pendingItem.setStatus(TaskStatus.PENDING);
        pendingItem.setAiGenerated(true);
        pendingItem.setAssignedToUser(assignee);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // publishActionItems Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void publishActionItems_OnlyDraftItems_PromotedToPending() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(draftItem, pendingItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        int count = actionItemService.publishActionItems(meeting.getId(), organizer);

        assertEquals(1, count, "Only the 1 DRAFT item should be published");
        assertEquals(TaskStatus.PENDING, draftItem.getStatus());
        assertNotNull(draftItem.getPublishedAt());
        assertEquals(TaskStatus.PENDING, pendingItem.getStatus()); // should remain unchanged
    }

    @Test
    void publishActionItems_DraftItemWithAssignedUser_SendsNotificationEmail() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.publishActionItems(meeting.getId(), organizer);

        verify(emailService, times(1)).sendTaskAssignmentNotification(draftItem);
    }

    @Test
    void publishActionItems_DraftItemWithNoAssignee_NoEmailSent() {
        draftItem.setAssignedToUser(null);
        draftItem.setAssignedToEmail(null);
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.publishActionItems(meeting.getId(), organizer);

        verify(emailService, never()).sendTaskAssignmentNotification(any());
    }

    @Test
    void publishActionItems_DraftItemWithExternalEmail_SendsNotification() {
        draftItem.setAssignedToUser(null);
        draftItem.setAssignedToEmail("external@company.com");
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.publishActionItems(meeting.getId(), organizer);

        verify(emailService, times(1)).sendTaskAssignmentNotification(draftItem);
    }

    @Test
    void publishActionItems_PublishedAtTimestampIsSet() {
        LocalDateTime beforePublish = LocalDateTime.now().minusSeconds(1);
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.publishActionItems(meeting.getId(), organizer);

        assertTrue(draftItem.getPublishedAt().isAfter(beforePublish));
    }

    @Test
    void publishActionItems_NonOrganizerTriesToPublish_ThrowsException() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));

        assertThrows(RuntimeException.class,
                () -> actionItemService.publishActionItems(meeting.getId(), outsider));
        verify(actionItemRepo, never()).save(any());
    }

    @Test
    void publishActionItems_MeetingNotFound_ThrowsException() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> actionItemService.publishActionItems(meeting.getId(), organizer));
    }

    @Test
    void publishActionItems_AllItemsAlreadyPending_NothingPublished() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.findByMeetingId(meeting.getId())).thenReturn(List.of(pendingItem));

        int count = actionItemService.publishActionItems(meeting.getId(), organizer);

        assertEquals(0, count);
        verify(actionItemRepo, never()).save(any());
        verify(emailService, never()).sendTaskAssignmentNotification(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createManualActionItem Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createManualActionItem_OrganizerWithRegisteredAssignee_CreatesWithPendingStatus() {
        CreateActionItemRequest request = new CreateActionItemRequest();
        request.setDescription("Manual task: update slides");
        request.setAssignedToEmail("assignee@example.com");
        request.setDeadline(LocalDateTime.now().plusDays(3));
        request.setPriority(2);

        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(userRepo.findByEmail("assignee@example.com")).thenReturn(Optional.of(assignee));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        ActionItemResponse response = actionItemService.createManualActionItem(meeting.getId(), request, organizer);

        assertNotNull(response);
        assertNotNull(response.getPublishedAt(), "Manual items are immediately published");
        verify(actionItemRepo).save(argThat(item -> {
            assertEquals(TaskStatus.PENDING, item.getStatus());
            assertFalse(item.isAiGenerated());
            assertEquals(assignee, item.getAssignedToUser());
            assertNull(item.getAssignedToEmail());
            return true;
        }));
    }

    @Test
    void createManualActionItem_ExternalEmail_AssignedToEmailSetUserNull() {
        CreateActionItemRequest request = new CreateActionItemRequest();
        request.setDescription("Send report to external consultant");
        request.setAssignedToEmail("consultant@external.org");

        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(userRepo.findByEmail("consultant@external.org")).thenReturn(Optional.empty());
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.createManualActionItem(meeting.getId(), request, organizer);

        verify(actionItemRepo).save(argThat(item -> {
            assertNull(item.getAssignedToUser());
            assertEquals("consultant@external.org", item.getAssignedToEmail());
            return true;
        }));
    }

    @Test
    void createManualActionItem_NoAssignee_CreatesWithoutAssignment() {
        CreateActionItemRequest request = new CreateActionItemRequest();
        request.setDescription("Unassigned task");

        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.createManualActionItem(meeting.getId(), request, organizer);

        verify(actionItemRepo).save(argThat(item -> {
            assertNull(item.getAssignedToUser());
            assertNull(item.getAssignedToEmail());
            return true;
        }));
        verify(userRepo, never()).findByEmail(any());
    }

    @Test
    void createManualActionItem_NonOrganizerTriesToCreate_ThrowsException() {
        when(meetingRepository.findById(meeting.getId())).thenReturn(Optional.of(meeting));

        CreateActionItemRequest request = new CreateActionItemRequest();
        request.setDescription("Unauthorized task");

        assertThrows(RuntimeException.class,
                () -> actionItemService.createManualActionItem(meeting.getId(), request, outsider));
        verify(actionItemRepo, never()).save(any());
    }

    @Test
    void createManualActionItem_MeetingNotFound_ThrowsException() {
        when(meetingRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> actionItemService.createManualActionItem(UUID.randomUUID(), new CreateActionItemRequest(), organizer));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // updateActionItem Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void updateActionItem_OrganizerUpdatesDescription_Succeeds() {
        UpdateActionItemRequest request = new UpdateActionItemRequest();
        request.setDescription("Updated description");

        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        ActionItemResponse response = actionItemService.updateActionItem(draftItem.getId(), request, organizer);

        assertNotNull(response);
        verify(actionItemRepo).save(argThat(item ->
                item.getDescription().equals("Updated description")));
    }

    @Test
    void updateActionItem_OrganizerReassignsToRegisteredUser_UserSetEmailCleared() {
        User newAssignee = new User();
        newAssignee.setId(UUID.randomUUID());
        newAssignee.setEmail("new@example.com");

        UpdateActionItemRequest request = new UpdateActionItemRequest();
        request.setAssignedToEmail("new@example.com");

        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));
        when(userRepo.findByEmail("new@example.com")).thenReturn(Optional.of(newAssignee));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.updateActionItem(draftItem.getId(), request, organizer);

        verify(actionItemRepo).save(argThat(item -> {
            assertEquals(newAssignee, item.getAssignedToUser());
            assertNull(item.getAssignedToEmail());
            return true;
        }));
    }

    @Test
    void updateActionItem_OrganizerClearsAssignee_BothFieldsNull() {
        UpdateActionItemRequest request = new UpdateActionItemRequest();
        request.setAssignedToEmail("  "); // blank = clear

        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));
        when(actionItemRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        actionItemService.updateActionItem(draftItem.getId(), request, organizer);

        verify(actionItemRepo).save(argThat(item -> {
            assertNull(item.getAssignedToUser());
            assertNull(item.getAssignedToEmail());
            return true;
        }));
    }

    @Test
    void updateActionItem_NonOrganizerTriesToUpdate_ThrowsException() {
        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));

        assertThrows(RuntimeException.class,
                () -> actionItemService.updateActionItem(draftItem.getId(), new UpdateActionItemRequest(), outsider));
        verify(actionItemRepo, never()).save(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // deleteActionItem Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void deleteActionItem_OrganizerDeletes_Succeeds() {
        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));

        actionItemService.deleteActionItem(draftItem.getId(), organizer);

        verify(actionItemRepo).delete(draftItem);
    }

    @Test
    void deleteActionItem_NonOrganizerTriesToDelete_ThrowsException() {
        when(actionItemRepo.findById(draftItem.getId())).thenReturn(Optional.of(draftItem));

        assertThrows(RuntimeException.class,
                () -> actionItemService.deleteActionItem(draftItem.getId(), outsider));
        verify(actionItemRepo, never()).delete(any());
    }

    @Test
    void deleteActionItem_TaskNotFound_ThrowsException() {
        when(actionItemRepo.findById(any())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> actionItemService.deleteActionItem(UUID.randomUUID(), organizer));
    }
}
