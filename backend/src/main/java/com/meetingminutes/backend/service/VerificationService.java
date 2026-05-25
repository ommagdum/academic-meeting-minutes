package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.AuthProvider;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.VerificationToken;
import com.meetingminutes.backend.exception.EntityNotFoundException;
import com.meetingminutes.backend.exception.ValidationException;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.repository.VerificationTokenRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationService {

    private final VerificationTokenRepo verificationTokenRepo;
    private final UserRepo userRepo;
    private final EmailService emailService;

    /**
     * Creates a new verification token for the given user.
     * Deletes any existing token for this user first.
     * Returns the generated token string.
     */
    @Transactional
    public String createVerificationToken(User user) {
        // Delete existing token if present
        verificationTokenRepo.findByUser(user).ifPresent(existing -> {
            verificationTokenRepo.delete(existing);
            verificationTokenRepo.flush();
        });

        String tokenValue = UUID.randomUUID().toString();
        VerificationToken token = new VerificationToken(tokenValue, user);
        verificationTokenRepo.save(token);
        log.info("Verification token created for user: {}", user.getEmail());
        return tokenValue;
    }

    /**
     * Verifies the user's email address using the given token.
     * Throws EntityNotFoundException if token not found.
     * Throws ValidationException if token is expired.
     */
    @Transactional
    public void verifyEmail(String tokenValue) {
        VerificationToken token = verificationTokenRepo.findByToken(tokenValue)
                .orElseThrow(() -> new EntityNotFoundException("Invalid verification link"));

        if (token.isExpired()) {
            log.warn("Expired verification token used for user: {}", token.getUser().getEmail());
            throw new ValidationException("EXPIRED: Verification link has expired. Please request a new one.");
        }

        User user = token.getUser();
        user.setEmailVerified(true);
        userRepo.save(user);
        verificationTokenRepo.delete(token);
        log.info("Email verified successfully for user: {}", user.getEmail());
    }

    /**
     * Resends a verification email to the given email address.
     * Does nothing silently if the user is not found (security: don't reveal existence).
     * Throws ValidationException if already verified or if the account is OAuth-only.
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepo.findByEmail(email).orElse(null);

        if (user == null) {
            // Don't reveal whether email exists — just return silently
            log.warn("Resend verification requested for non-existent email: {}", email);
            return;
        }

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ValidationException("Email is already verified");
        }

        if (user.getAuthProvider() == AuthProvider.GOOGLE && user.getPasswordHash() == null) {
            throw new ValidationException("This account uses Google sign-in and does not require email verification.");
        }

        String tokenValue = createVerificationToken(user);
        emailService.sendVerificationEmail(user, tokenValue);
        log.info("Verification email resent to: {}", email);
    }
}
