package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class JwtServiceTest {

    private JwtService jwtService;
    private User user;
    private final String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final long expiration = 86400000L;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", secret);
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", expiration);

        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");
        user.setName("Test User");
        user.setRole(UserRole.PARTICIPANT);
        user.setPasswordHash("password");
    }

    @Test
    void generateToken_ReturnsNonNullAndNonBlank() {
        String token = jwtService.generateToken(user);
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUsername_EqualsUserEmail() {
        String token = jwtService.generateToken(user);
        String username = jwtService.extractUsername(token);
        assertEquals("test@example.com", username);
    }

    @Test
    void extractUserId_EqualsUserId() {
        String token = jwtService.generateToken(user);
        String userId = jwtService.extractUserId(token);
        assertEquals(user.getId().toString(), userId);
    }

    @Test
    void extractRole_EqualsUserRole() {
        String token = jwtService.generateToken(user);
        String role = jwtService.extractClaim(token, claims -> claims.get("role", String.class));
        assertEquals("PARTICIPANT", role);
    }

    @Test
    void isTokenValid_CorrectUser_ReturnsTrue() {
        String token = jwtService.generateToken(user);
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "test@example.com", "password", Collections.emptyList());
        
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void isTokenValid_DifferentUser_ReturnsFalse() {
        String token = jwtService.generateToken(user);
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "other@example.com", "password", Collections.emptyList());

        assertFalse(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void isTokenValid_ExpiredToken_ReturnsFalse() throws InterruptedException {
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 1L); // 1 millisecond expiration
        String token = jwtService.generateToken(user);
        
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                "test@example.com", "password", Collections.emptyList());

        Thread.sleep(10); // Wait for expiration

        assertThrows(ExpiredJwtException.class, () -> jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void tamperedToken_ThrowsJwtException() {
        String token = jwtService.generateToken(user);
        String tamperedToken = token + "bad";

        assertThrows(SignatureException.class, () -> jwtService.extractUsername(tamperedToken));
    }
}
