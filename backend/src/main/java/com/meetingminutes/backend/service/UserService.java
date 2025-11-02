package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private final UserRepo userRepo;

    public User findByEmail(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: "+ email));
    }

    public User findById(String id) {
        return userRepo.findById(UUID.fromString(id))
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    @Transactional
    public User updateUserProfile(User user, String name, String profilePictureUrl) {
        log.info("Updating profile for user: {}", user.getEmail());

        boolean updated = false;

        if (name != null && !name.trim().isEmpty() && !name.equals(user.getName())) {
            user.setName(name.trim());
            updated = true;
            log.debug("Updated name for user: {}", user.getEmail());
        }

        if (profilePictureUrl != null && !profilePictureUrl.equals(user.getProfilePictureUrl())) {
            user.setProfilePictureUrl(profilePictureUrl);
            updated = true;
            log.debug("Updated profile picture for user: {}", user.getEmail());
        }

        if (updated) {
            user.setUpdatedAt(LocalDateTime.now());
            User savedUser = userRepo.save(user);
            log.info("Profile updated successfully for user: {}", user.getEmail());
            return savedUser;
        }

        log.debug("No changes detected for user: {}", user.getEmail());
        return user;
    }

    public boolean userExists(String email) {
        return userRepo.findByEmail(email).isPresent();
    }
}
