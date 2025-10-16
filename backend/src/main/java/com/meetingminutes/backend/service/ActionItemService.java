package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.TaskStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class ActionItemService {

    private final ActionItemRepo actionItemRepo;
    private final MeetingRepository meetingRepository;
    private final UserRepo userRepo;
    private final EmailService emailService;

    public List<ActionItem> getMeetingActionItems(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if(!hasAccessToMeeting(meeting, user)) {
            throw new RuntimeException("User does not have access to this meeting");
        }
        return actionItemRepo.findByMeetingIdOrderByCreatedAtAsc(meetingId);
    }

    public List<ActionItem> getUserTasks(User user) {
        return actionItemRepo.findByAssignedToUserOrderByDeadlineAsc(user.getId());
    }
    public List<ActionItem> getUserTasksByStatus(User user, TaskStatus status) {
        return actionItemRepo.findByAssignedToUserAndStatus(user.getId(), status);
    }

    public ActionItem createActionItem(UUID meetingId, String description, String assignedToEmail, LocalDateTime deadline, User creator) {
        Meeting meeting = meetingRepository.findByIdAndCreatedBy(meetingId, creator)
                .orElseThrow(() -> new RuntimeException("Meeting not found or access denied"));

        ActionItem actionItem = new ActionItem();
        actionItem.setMeeting(meeting);
        actionItem.setDescription(description);
        actionItem.setDeadline(deadline);
        actionItem.setStatus(TaskStatus.PENDING);

        if (assignedToEmail != null) {
            Optional<User> assignedUser = userRepo.findByEmail(assignedToEmail);
            if (assignedUser.isPresent()) {
                actionItem.setAssignedToUser(assignedUser.get());
            } else {
                actionItem.setAssignedToEmail(assignedToEmail);
            }
        }

        ActionItem savedItem = actionItemRepo.save(actionItem);

        if(actionItem.getAssignedToUser() != null) {
            emailService.sendTaskAssignmentNotification(actionItem);
        }
        return savedItem;
    }

    public ActionItem updateTaskStatus(UUID taskId, TaskStatus newStatus, User user) {
        ActionItem task = actionItemRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if(!canUserUpdateTask(task, user)) {
            throw new RuntimeException("Cannot update this task");
        }

        task.setStatus(newStatus);

        if (newStatus == TaskStatus.COMPLETED) {
            task.setCompletedAt(LocalDateTime.now());
        }

        return actionItemRepo.save(task);
    }

    public ActionItem acknowledgeTask(UUID taskId, User user) {
        ActionItem task = actionItemRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if(!canUserUpdateTask(task, user)) {
            throw new RuntimeException("Cannot acknowledge this task");
        }

        task.setAcknowledged(true);
        task.setAcknowledgedAt(LocalDateTime.now());

        return actionItemRepo.save(task);

    }

    public ActionItem updateTask(UUID taskId, String description, LocalDateTime deadline,
                                 Integer priority, String notes, User user) {
        ActionItem task = actionItemRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Meeting meeting = task.getMeeting();
        if(!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Only meeting creator can update task details");
        }

        if ( description != null) {
            task.setDescription(description);
        }

        if (deadline != null) {
            task.setDeadline(deadline);
        }

        if (priority != null) {
            task.setPriority(priority);
        }

        if (notes != null) {
            task.setNotes(notes);
        }

        return actionItemRepo.save(task);
    }

    public void deleteTask(UUID taskId, User user) {
        ActionItem task = actionItemRepo.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Meeting meeting = task.getMeeting();
        if (!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Only meeting creator can delete tasks");
        }

        actionItemRepo.delete(task);
    }

    public List<ActionItem> getOverdueTasks() {
        return actionItemRepo.findOverdueActionItems(LocalDateTime.now());
    }

    public List<ActionItem> getUnacknowledgedTasks(User user) {
        return actionItemRepo.findUnacknowledgedActionItemsByUser(user.getId());
    }

    public long getUserTaskCountByStatus(User user, TaskStatus status) {
        return actionItemRepo.countByAssignedToUserAndStatus(user.getId(), status);
    }

    private boolean canUserUpdateTask(ActionItem task, User user) {
        // User can update if they are assigned to the task
        return task.getAssignedToUser() != null &&
                task.getAssignedToUser().getId().equals(user.getId());
    }

    private boolean hasAccessToMeeting(Meeting meeting, User user) {
        if (meeting.getCreatedBy().getId().equals(user.getId())) {
            return true;
        }

        return actionItemRepo.findByMeetingId(meeting.getId()).stream()
                .anyMatch(task -> task.getAssignedToUser() != null &&
                        task.getAssignedToUser().getId().equals(user.getId()));
    }
}
