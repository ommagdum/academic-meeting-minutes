package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationTokenRepo extends JpaRepository<VerificationToken, UUID> {

    Optional<VerificationToken> findByToken(String token);

    Optional<VerificationToken> findByTokenAndType(String token, com.meetingminutes.backend.entity.TokenType type);

    Optional<VerificationToken> findByUser(User user);

    Optional<VerificationToken> findByUserAndType(User user, com.meetingminutes.backend.entity.TokenType type);

    void deleteByUser(User user);
}
