package com.meetingminutes.backend.handler;

import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.service.AttendeeService;
import com.meetingminutes.backend.service.JwtService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@Slf4j
public class CustomOAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtService jwtService;
    private final UserRepo userRepo;
    private final AttendeeService attendeeService;

    @Value("${app.oauth2.redirect-uri}")
    private String redirectUri;

    public CustomOAuth2SuccessHandler(JwtService jwtService, UserRepo userRepo, AttendeeService attendeeService) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
        this.attendeeService = attendeeService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws
            IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String email = (String) attributes.get("email");
        String name = (String) attributes.get("name");
        String picture = (String) attributes.get("picture");
        String googleId = (String) attributes.get("sub");
        Boolean emailVerified = (Boolean) attributes.get("email_verified");

        log.info("OAuth2 login successful for user: {}", email);

        User user = userRepo.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setName(name);
                    newUser.setRole(UserRole.PARTICIPANT);
                    return newUser;
                });

        user.setGoogleId(googleId);
        user.setProfilePictureUrl(picture);
        user.setEmailVerified(Boolean.TRUE.equals(emailVerified));
        user.setLastLogin(LocalDateTime.now());

        User savedUser = userRepo.save(user);
        log.info("User saved/updated: {}", savedUser.getEmail());

        // 🔥 CRITICAL FIX: Link any pending attendee records
        try {
            log.info("Attempting to link attendee records for email: {}", email);
            attendeeService.linkAttendeeToUser(email, savedUser);
            log.info("Successfully linked attendee records for user: {}", email);
        } catch (Exception e) {
            log.error("Failed to link attendee records for user: {}", email, e);
            // Don't throw exception - we still want the login to succeed
        }

        String token = jwtService.generateToken(user);

        String redirectUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("token", token)
                .build().toUriString();

        log.info("Redirecting user to: {}", redirectUrl);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

}
