package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.UserRepo;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {
    private final UserRepo userRepo;

    public UserService(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    public User findByEmail(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: "+ email));
    }

    public User findById(String id) {
        return userRepo.findById(UUID.fromString(id))
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }
}
