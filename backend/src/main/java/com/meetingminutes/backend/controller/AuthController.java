package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.AuthResponse;
import com.meetingminutes.backend.dto.LoginRequest;
import com.meetingminutes.backend.dto.RegisterRequest;
import com.meetingminutes.backend.dto.UserResponse;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.exception.EmailNotVerifiedException;
import com.meetingminutes.backend.exception.ErrorResponse;
import com.meetingminutes.backend.exception.ValidationException;
import com.meetingminutes.backend.service.AuthService;
import com.meetingminutes.backend.service.UserService;
import com.meetingminutes.backend.service.VerificationService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final UserService userService;
    private final AuthService authService;
    private final VerificationService verificationService;

    @PostMapping("/register")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for email: {}", request.getEmail());
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            log.warn("Registration failed for email: {} - {}", request.getEmail(), e.getMessage());
            // Check if it's an email-already-registered conflict
            if (e.getMessage() != null && e.getMessage().contains("already registered")) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorResponse("EMAIL_ALREADY_EXISTS", e.getMessage()));
            }
            // Email send failure or other runtime error
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("REGISTRATION_ERROR", e.getMessage()));
        }
    }

    @PostMapping("/login")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (EmailNotVerifiedException e) {
            // Distinct 403 so the frontend can show the "resend verification" UI
            log.warn("Login blocked — email not verified for: {}", request.getEmail());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse(e.getErrorCode(), e.getMessage()));
        } catch (Exception e) {
            log.warn("Login failed for email: {} - {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("INVALID_CREDENTIALS", "Incorrect email or password."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        SecurityContextHolder.clearContext();
        log.info("User logged out");
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    // ─── Email Verification Endpoints ────────────────────────────────────────────

    /**
     * GET /api/auth/verify-email?token={token}
     * Verifies the email using the one-time token from the verification email.
     */
    @GetMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam String token) {
        try {
            verificationService.verifyEmail(token);
            log.info("Email verified via token");
            return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
        } catch (com.meetingminutes.backend.exception.EntityNotFoundException e) {
            log.warn("Verification attempted with invalid token");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "INVALID_TOKEN", "message", "Invalid verification link"));
        } catch (ValidationException e) {
            log.warn("Verification attempted with expired token");
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(Map.of("error", "TOKEN_EXPIRED", "message", "Verification link has expired. Please request a new one."));
        }
    }

    /**
     * POST /api/auth/resend-verification
     * Resends a verification email. Always returns 200 to avoid revealing whether an email exists.
     * Body: { "email": "user@example.com" }
     */
    @PostMapping("/resend-verification")
    @RateLimiter(name = "authEndpoints")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "MISSING_EMAIL", "message", "Email is required"));
        }

        try {
            verificationService.resendVerificationEmail(email);
            log.info("Verification email resend requested for: {}", email);
        } catch (ValidationException e) {
            if (e.getMessage().contains("already verified")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "ALREADY_VERIFIED", "message", "Email is already verified"));
            }
            // OAuth user trying to resend — return 200 silently for security
            log.info("Resend verification silently ignored: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error resending verification email: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "EMAIL_SEND_FAILED", "message", "Failed to send verification email. Please try again."));
        }

        // Always 200 for security — don't reveal whether email exists
        return ResponseEntity.ok(Map.of("message", "Verification email sent"));
    }
}