package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepo extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    List<User> findByRole(UserRole role);
    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.email IN :emails")
    List<User> findByEmails(@Param("emails") List<String> emails);

    @Query("SELECT u FROM User u WHERE u.lastLogin < :cutoffDate AND u.active = true")
    List<User> findInActiveUsersSince(@Param("cutoffDate")LocalDateTime cutoffDate);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role AND u.active = true")
    long countActiveUsersByRole(@Param("role") UserRole role);

    @Query("SELECT u FROM User u WHERE u.active = true ORDER BY u.lastLogin DESC NULLS LAST")
    List<User> findActiveUsersOrderByLastLogin();
}
