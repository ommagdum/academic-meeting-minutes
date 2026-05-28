package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.AuthResponse;
import com.meetingminutes.backend.dto.LoginRequest;
import com.meetingminutes.backend.dto.RegisterRequest;
import com.meetingminutes.backend.entity.AuthProvider;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.exception.EmailNotVerifiedException;
import com.meetingminutes.backend.repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepo userRepo;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private VerificationService verificationService;
    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setName("Test User");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123");

        user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");
        user.setPasswordHash("encoded_password");
        user.setRole(UserRole.PARTICIPANT);
        user.setAuthProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
    }

    // --- register Tests ---

    @Test
    void register_EmailExists_ThrowsException() {
        when(userRepo.existsByEmail(registerRequest.getEmail())).thenReturn(true);

        Exception exception = assertThrows(RuntimeException.class, () -> authService.register(registerRequest));
        assertEquals("Email already registered", exception.getMessage());
    }

    @Test
    void register_NewEmail_ReturnsAuthResponseNoTokenEmailSent() {
        when(userRepo.existsByEmail(registerRequest.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(registerRequest.getPassword())).thenReturn("encoded_password");
        when(userRepo.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(verificationService.createVerificationToken(any(User.class))).thenReturn("verify_token");

        AuthResponse response = authService.register(registerRequest);

        assertEquals("VERIFICATION_EMAIL_SENT", response.getMessage());
        assertNull(response.getAccessToken());
        assertEquals("test@example.com", response.getUser().getEmail());

        verify(userRepo).save(argThat(u -> 
                !u.getEmailVerified() && 
                u.getAuthProvider() == AuthProvider.LOCAL && 
                u.getRole() == UserRole.PARTICIPANT));
        verify(verificationService).createVerificationToken(any(User.class));
        verify(emailService).sendVerificationEmail(any(User.class), eq("verify_token"));
    }

    // --- login Tests ---

    @Test
    void login_ValidCredentialsVerifiedEmail_ReturnsToken() {
        when(userRepo.findByEmail(loginRequest.getEmail())).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("jwt_token");

        AuthResponse response = authService.login(loginRequest);

        assertNotNull(response.getAccessToken());
        assertEquals("jwt_token", response.getAccessToken());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(userRepo).save(argThat(u -> u.getLastLogin() != null));
    }

    @Test
    void login_EmailNotVerified_ThrowsException() {
        user.setEmailVerified(false);
        when(userRepo.findByEmail(loginRequest.getEmail())).thenReturn(Optional.of(user));

        Exception exception = assertThrows(EmailNotVerifiedException.class, () -> authService.login(loginRequest));
        assertTrue(exception.getMessage().contains("Please verify your email"));
    }

    @Test
    void login_GoogleOnlyAccount_ThrowsException() {
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setPasswordHash(null);
        when(userRepo.findByEmail(loginRequest.getEmail())).thenReturn(Optional.of(user));

        Exception exception = assertThrows(RuntimeException.class, () -> authService.login(loginRequest));
        assertTrue(exception.getMessage().contains("uses Google login"));
    }

    @Test
    void login_WrongPassword_ThrowsException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }

    @Test
    void login_UserNotFoundAfterAuthPasses_ThrowsException() {
        when(userRepo.findByEmail(loginRequest.getEmail())).thenReturn(Optional.empty());

        Exception exception = assertThrows(RuntimeException.class, () -> authService.login(loginRequest));
        assertEquals("User not found", exception.getMessage());
    }
}
