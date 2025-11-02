package com.meetingminutes.backend.controller;


import com.meetingminutes.backend.dto.UpdateProfileRequest;
import com.meetingminutes.backend.dto.UserResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.UserService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
            UserResponse response = UserResponse.from(user);
            return ResponseEntity.ok(response);
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
            // Get current user
            User user = userService.findByEmail(email);

            // Update and save user profile
            User updatedUser = userService.updateUserProfile(
                    user,
                    request.getName(),
                    request.getProfilePictureUrl()
            );

            UserResponse response = UserResponse.from(updatedUser);
            log.info("Profile updated successfully for user: {}", email);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Failed to update profile for user: {}", email, e);
            return ResponseEntity.status(404).body(null);
        } catch (Exception e) {
            log.error("Unexpected error updating profile for user: {}", email, e);
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/profile/exists")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<Boolean> checkUserExists(@RequestParam String email) {
        log.debug("Checking if user exists with email: {}", email);

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(false);
        }

        try {
            boolean exists = userService.userExists(email.trim());
            return ResponseEntity.ok(exists);
        } catch (Exception e) {
            log.error("Error checking user existence for email: {}", email, e);
            return ResponseEntity.status(500).body(false);
        }
    }

    @GetMapping("/{userId}/profile")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<UserResponse> getUserProfileById(
            @PathVariable String userId,
            Authentication authentication) {

        String currentUserEmail = authentication.getName();
        log.debug("Fetching profile for user ID: {} by: {}", userId, currentUserEmail);

        try {
            User user = userService.findById(userId);
            UserResponse response = UserResponse.from(user);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("User not found with ID: {}", userId);
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            log.error("Error fetching profile for user ID: {}", userId, e);
            return ResponseEntity.status(500).build();
        }
    }
}
