package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepo extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    List<User> findByRole(UserRole role);
    boolean existsByEmail(String email);
}
