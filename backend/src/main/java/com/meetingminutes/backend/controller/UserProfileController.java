package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.UpdateProfileRequest;
import com.meetingminutes.backend.dto.UserResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.service.UserService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserProfileController {

    private final UserService userService;

    @GetMapping("/profile")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<UserResponse> getCurrentUserProfile(Authentication authentication) {
        String email = authentication.getName();
        log.debug("Fetching profile for user: {}", email);
        try {
            User user = userService.findByEmail(email);
            return ResponseEntity.ok(UserResponse.from(user));
        } catch (RuntimeException e) {
            log.error("Failed to fetch profile for user: {}", email, e);
            return ResponseEntity.status(404).build();
        }
    }

    @PutMapping("/profile")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<UserResponse> updateUserProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        log.info("Updating profile for user: {}", email);
        try {
            User user = userService.findByEmail(email);
            User updatedUser = userService.updateUserProfile(
                    user,
                    request.getName(),
                    request.getProfilePictureUrl()
            );
            log.info("Profile updated successfully for user: {}", email);
            return ResponseEntity.ok(UserResponse.from(updatedUser));
        } catch (RuntimeException e) {
            log.error("Failed to update profile for user: {}", email, e);
            return ResponseEntity.status(404).body(null);
        } catch (Exception e) {
            log.error("Unexpected error updating profile for user: {}", email, e);
            return ResponseEntity.status(500).body(null);
        }
    }

    // FIX-029 — email enumeration: always return same response regardless of existence
    @GetMapping("/profile/exists")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<String> checkUserExists(@RequestParam String email) {
        log.debug("User existence check requested for email: {}", email);

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        // Always return the same message — never reveal whether email is registered
        return ResponseEntity.ok("If this email is registered, it will appear in search results.");
    }

    @GetMapping("/{userId}/profile")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<UserResponse> getUserProfileById(
            @PathVariable String userId,
            Authentication authentication) {

        String currentUserEmail = authentication.getName();
        log.debug("Fetching profile for user ID: {} by: {}", userId, currentUserEmail);

        try {
            User caller = userService.findByEmail(currentUserEmail);

            // Only allow self-access or ADMIN
            boolean isSelf = caller.getId().equals(UUID.fromString(userId));
            boolean isAdmin = caller.getRole() == UserRole.ADMIN;

            if (!isSelf && !isAdmin) {
                log.warn("User {} attempted to access profile of {}", currentUserEmail, userId);
                return ResponseEntity.status(403).build();
            }

            User user = userService.findById(userId);
            return ResponseEntity.ok(UserResponse.from(user));

        } catch (IllegalArgumentException e) {
            // Invalid UUID format
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("User not found with ID: {}", userId);
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            log.error("Error fetching profile for user ID: {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }
}