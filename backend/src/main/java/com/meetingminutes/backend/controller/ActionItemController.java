package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.ActionItemResponse;
import com.meetingminutes.backend.dto.ReassignTaskRequest;
import com.meetingminutes.backend.dto.UpdateTaskRequest;
import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.TaskStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.ActionItemService;
import com.meetingminutes.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/action-items")
public class ActionItemController {

    private final ActionItemService actionItemService;
    private final UserService userService;

    @GetMapping("/my-tasks")
    public ResponseEntity<List<ActionItemResponse>> getMyTasks(
            @RequestParam(required = false) TaskStatus status,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);

        List<ActionItemResponse> responses;
        if (status != null) {
            responses = actionItemService.getUserTasksByStatus(user, status)
                    .stream()
                    .map(this::convertToResponse)
                    .toList();
        } else {
            responses = actionItemService.getUserTasks(user)
                    .stream()
                    .map(this::convertToResponse)
                    .toList();
        }

        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ActionItemResponse> updateTaskStatus(
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        var updatedTask = actionItemService.updateTaskStatus(taskId, request.getStatus(), user);
        var response = convertToResponse(updatedTask);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{taskId}/acknowledge")
    public ResponseEntity<ActionItemResponse> acknowledgeTask(
            @PathVariable UUID taskId,
            Authentication authentication) {

        String email = authentication.getName();
        User user = userService.findByEmail(email);
        var acknowledgedTask = actionItemService.acknowledgeTask(taskId, user);
        var response = convertToResponse(acknowledgedTask);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{taskId}/assign")
    public ResponseEntity<ActionItemResponse> reassignTask(
            @PathVariable UUID taskId,
            @RequestBody ReassignTaskRequest request, Authentication authentication
            ) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);

        ActionItem updatedTask = actionItemService.reassignTask(taskId, request.getAssignee(), user);
        return ResponseEntity.ok(convertToResponse(updatedTask));
    }

    private ActionItemResponse convertToResponse(com.meetingminutes.backend.entity.ActionItem actionItem) {
        return ActionItemResponse.from(actionItem);
    }

}
