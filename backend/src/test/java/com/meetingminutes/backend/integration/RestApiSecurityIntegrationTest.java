package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
public class RestApiSecurityIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    @SuppressWarnings("resource")
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:6.0")
            .withExposedPorts(27017);

    @Container
    @SuppressWarnings("resource")
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("jwt.secret", () -> "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        registry.add("jwt.expiration", () -> "86400000");
        registry.add("spring.servlet.multipart.max-file-size", () -> "1MB"); // Small limit for testing
        registry.add("spring.servlet.multipart.max-request-size", () -> "1MB");
        registry.add("app.upload.max-file-size", () -> "1048576"); // 1MB for application check
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private JwtService jwtService;

    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private com.meetingminutes.backend.service.EmailService emailService;
    
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    private User owner;
    private User attacker;
    private Meeting meeting;
    private String attackerToken;
    private String ownerToken;

    @BeforeEach
    void setUp() {
        meetingRepository.deleteAll();
        userRepository.deleteAll();

        owner = new User();
        owner.setEmail("owner@example.com");
        owner.setName("Meeting Owner");
        owner.setRole(UserRole.PARTICIPANT);
        owner = userRepository.save(owner);

        attacker = new User();
        attacker.setEmail("attacker@example.com");
        attacker.setName("Malicious User");
        attacker.setRole(UserRole.PARTICIPANT);
        attacker = userRepository.save(attacker);

        ownerToken = jwtService.generateToken(owner);
        attackerToken = jwtService.generateToken(attacker);

        meeting = new Meeting();
        meeting.setTitle("Secret Strategy Meeting");
        meeting.setCreatedBy(owner);
        meeting.setScheduledTime(LocalDateTime.now().plusDays(1));
        meeting = meetingRepository.save(meeting);
    }

    @Test
    void accessMeetingWithoutJwt_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/meetings/" + meeting.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessMeetingWithValidJwtButNotAttendee_ReturnsNotFoundOrForbidden() throws Exception {
        // The current implementation of MeetingService throws EntityNotFoundException ("Meeting not found or access denied")
        // when a user requests a meeting they did not create and are not an attendee of.
        // It's mapped to 404 Not Found by GlobalExceptionHandler.
        mockMvc.perform(get("/api/v1/meetings/" + meeting.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + attackerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));
    }

    @Test
    void oauth2LoginFlow_ReturnsRedirectToGoogle() throws Exception {
        ClientRegistration clientRegistration = ClientRegistration.withRegistrationId("google")
                .clientId("test-client-id")
                .clientSecret("test-client-secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                .clientName("Google")
                .build();
        when(clientRegistrationRepository.findByRegistrationId(anyString())).thenReturn(clientRegistration);

        mockMvc.perform(get("/oauth2/authorization/google"))
                .andExpect(status().is3xxRedirection())
                .andExpect(result -> {
                    String redirectedUrl = result.getResponse().getRedirectedUrl();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            redirectedUrl != null && redirectedUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
                            "Redirected URL does not match: " + redirectedUrl
                    );
                });
    }

    @Test
    void fileUploadExceedsLimit_ReturnsPayloadTooLarge() throws Exception {
        // Create a fake file larger than 1MB
        byte[] largeFileBytes = new byte[1024 * 1024 * 2]; // 2MB
        MockMultipartFile largeFile = new MockMultipartFile(
                "file",
                "audio.mp3",
                "audio/mpeg",
                largeFileBytes
        );

        mockMvc.perform(multipart("/api/v1/meetings/" + meeting.getId() + "/upload-audio")
                        .file(largeFile)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().is4xxClientError());
    }
}
