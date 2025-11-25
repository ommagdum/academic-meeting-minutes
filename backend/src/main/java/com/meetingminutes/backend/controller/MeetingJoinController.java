package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.ApiResponse;
import com.meetingminutes.backend.dto.JoinMeetingResponse;
import com.meetingminutes.backend.dto.MeetingDetailsFromToken;
import com.meetingminutes.backend.dto.TokenValidationResponse;
import com.meetingminutes.backend.entity.Attendee;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.exception.EntityNotFoundException;
import com.meetingminutes.backend.exception.ValidationException;
import com.meetingminutes.backend.service.AttendeeService;
import com.meetingminutes.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/meetings")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Meeting Join", description = "Public endpoints for joining meetings via invitation tokens")
public class MeetingJoinController {

    private final AttendeeService attendeeService;
    private final UserService userService;

    @PostMapping("/join")
    @Operation(summary = "Join meeting by token",
            description = "Allows any user to join a meeting using a valid invitation token. Works for both authenticated and unauthenticated users.")
    public ResponseEntity<ApiResponse<JoinMeetingResponse>> joinMeetingByToken(
            @Parameter(description = "Invitation token received via email", required = true)
            @RequestParam @NotBlank String token,
            Authentication authentication) {

        try {
            User user = null;
            if (authentication != null && authentication.isAuthenticated()) {
                String email = authentication.getName();
                user = userService.findByEmail(email);
            }

            log.info("Processing meeting join request with token: {} for user: {}",
                    token, user != null ? user.getEmail() : "unauthenticated");

            Attendee attendee = attendeeService.joinMeetingByToken(token, user);

            JoinMeetingResponse response = JoinMeetingResponse.builder()
                    .meetingId(attendee.getMeeting().getId())
                    .meetingTitle(attendee.getMeeting().getTitle())
                    .status(attendee.getStatus())
                    .message("Successfully joined the meeting")
                    .build();

            log.info("Successfully joined meeting {} with token: {}",
                    attendee.getMeeting().getTitle(), token);

            return ResponseEntity.ok(ApiResponse.success(response));

        } catch (EntityNotFoundException e) {
            log.warn("Invalid token attempted: {}", token);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid or expired invitation token", token, "join"));
        } catch (ValidationException e) {
            log.warn("Validation failed for token: {}", token);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage(), token, "join"));
        } catch (Exception e) {
            log.error("Error joining meeting with token: {}", token, e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to join meeting. Please try again.", token, "join"));
        }
    }

    @GetMapping("/join/validate")
    @Operation(summary = "Validate invitation token",
            description = "Check if an invitation token is valid before attempting to join")
    public ResponseEntity<ApiResponse<TokenValidationResponse>> validateInvitationToken(
            @Parameter(description = "Invitation token to validate", required = true)
            @RequestParam @NotBlank String token) {

        try {
            log.debug("Validating token: {}", token);

            TokenValidationResponse validation = attendeeService.validateInvitationToken(token);

            return ResponseEntity.ok(ApiResponse.success(validation));

        } catch (Exception e) {
            log.error("Error validating token: {}", token, e);
            return ResponseEntity.ok(ApiResponse.success(
                    TokenValidationResponse.builder()
                            .valid(false)
                            .message("Invalid token")
                            .build()));
        }
    }

    @GetMapping("/join/token-details")
    @Operation(summary = "Get meeting details from token",
            description = "Retrieve meeting information from a valid invitation token without joining")
    public ResponseEntity<ApiResponse<MeetingDetailsFromToken>> getMeetingDetailsFromToken(
            @Parameter(description = "Invitation token", required = true)
            @RequestParam @NotBlank String token) {

        try {
            log.debug("Getting meeting details for token: {}", token);

            MeetingDetailsFromToken details = attendeeService.getMeetingDetailsFromToken(token);

            return ResponseEntity.ok(ApiResponse.success(details));

        } catch (EntityNotFoundException e) {
            log.warn("Invalid token for details request: {}", token);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid invitation token", token, "join"));
        } catch (Exception e) {
            log.error("Error getting meeting details for token: {}", token, e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to retrieve meeting details", token, "join"));
        }
    }
}
