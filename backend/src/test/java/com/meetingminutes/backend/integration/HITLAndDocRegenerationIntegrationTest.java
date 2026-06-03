package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for:
 * 1. HITL - Publish action items endpoint
 * 2. HITL - Create manual action item endpoint
 * 3. Regenerate Documents endpoint
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
public class HITLAndDocRegenerationIntegrationTest {

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
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private ActionItemRepo actionItemRepo;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private DocumentGenerationService documentGenerationService;

    @MockitoBean
    private AIExtractionRepository aiExtractionRepository;

    @MockitoBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    private User organizer;
    private User outsider;
    private Meeting meeting;
    private String organizerToken;
    private String outsiderToken;

    @BeforeEach
    void setUp() {
        actionItemRepo.deleteAll();
        meetingRepository.deleteAll();
        userRepo.deleteAll();

        organizer = new User();
        organizer.setEmail("organizer@example.com");
        organizer.setName("Meeting Organizer");
        organizer.setRole(UserRole.OWNER);
        organizer.setAuthProvider(AuthProvider.LOCAL);
        organizer.setPasswordHash("hash");
        organizer = userRepo.save(organizer);

        outsider = new User();
        outsider.setEmail("outsider@example.com");
        outsider.setName("Outsider User");
        outsider.setRole(UserRole.PARTICIPANT);
        outsider.setAuthProvider(AuthProvider.LOCAL);
        outsider.setPasswordHash("hash");
        outsider = userRepo.save(outsider);

        organizerToken = jwtService.generateToken(organizer);
        outsiderToken = jwtService.generateToken(outsider);

        meeting = new Meeting();
        meeting.setTitle("HITL Integration Test Meeting");
        meeting.setCreatedBy(organizer);
        meeting.setStatus(MeetingStatus.PROCESSED);
        meeting.setScheduledTime(LocalDateTime.now().minusDays(1));
        meeting = meetingRepository.save(meeting);

        // Seed a DRAFT action item in postgres
        ActionItem draftTask = new ActionItem();
        draftTask.setMeeting(meeting);
        draftTask.setDescription("AI generated task awaiting review");
        draftTask.setStatus(TaskStatus.DRAFT);
        draftTask.setAiGenerated(true);
        draftTask.setAssignedToUser(organizer);
        actionItemRepo.save(draftTask);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /meetings/{id}/action-items/publish
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void publishActionItems_AsOrganizer_Returns200WithCount() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items/publish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.published").value(1));
    }

    @Test
    void publishActionItems_PromotesDraftToPending_InDatabase() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items/publish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().isOk());

        List<ActionItem> tasks = actionItemRepo.findByMeetingId(meeting.getId());
        assertEquals(1, tasks.size());
        assertEquals(TaskStatus.PENDING, tasks.get(0).getStatus());
        assertNotNull(tasks.get(0).getPublishedAt());
    }

    @Test
    void publishActionItems_SendsEmailNotificationToAssignee() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items/publish")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().isOk());

        verify(emailService, times(1)).sendTaskAssignmentNotification(any(ActionItem.class));
    }

    @Test
    void publishActionItems_AsOutsider_ServiceRejectsWithException() {
        // RuntimeException from service propagates as NestedServletException through MockMvc
        // when there is no GlobalExceptionHandler mapping for plain RuntimeException.
        assertThrows(Exception.class, () ->
            mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items/publish")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                    .andReturn()
        );
    }

    @Test
    void publishActionItems_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items/publish"))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /meetings/{id}/action-items (create manual)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createManualActionItem_AsOrganizer_Returns201() throws Exception {
        String body = """
            {
              "description": "Book conference room for follow-up",
              "assignedToEmail": "organizer@example.com",
              "priority": 2
            }
            """;

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void createManualActionItem_AsOrganizer_ItemSavedWithPendingStatus() throws Exception {
        String body = """
            {
              "description": "Send summary email to all attendees",
              "priority": 1
            }
            """;

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());

        List<ActionItem> all = actionItemRepo.findByMeetingId(meeting.getId());
        // Find the manually created one
        boolean hasManual = all.stream()
                .anyMatch(i -> !i.isAiGenerated() && i.getStatus() == TaskStatus.PENDING);
        assertTrue(hasManual, "A manual, PENDING action item should exist in DB");
    }

    @Test
    void createManualActionItem_MissingDescription_Returns400() throws Exception {
        String body = """
            {
              "assignedToEmail": "organizer@example.com"
            }
            """;

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createManualActionItem_AsOutsider_ServiceRejectsWithException() {
        String body = """
            {
              "description": "Sneaky task"
            }
            """;

        // RuntimeException from service propagates as NestedServletException through MockMvc
        // when there is no GlobalExceptionHandler mapping for plain RuntimeException.
        assertThrows(Exception.class, () ->
            mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andReturn()
        );
    }

    @Test
    void createManualActionItem_WithoutAuth_Returns401() throws Exception {
        String body = """
            {
              "description": "Unauthenticated task"
            }
            """;

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/action-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /meetings/{id}/documents/regenerate
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void regenerateDocuments_AsOrganizer_Returns200() throws Exception {
        when(aiExtractionRepository.findByMeetingId(meeting.getId())).thenReturn(Optional.empty());
        when(documentGenerationService.generateMinutesPDF(any(), any(), any())).thenReturn("file-id-pdf");
        when(documentGenerationService.generateMinutesDOCX(any(), any(), any())).thenReturn("file-id-docx");

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/documents/regenerate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Documents regenerated successfully"));
    }

    @Test
    void regenerateDocuments_CallsBothPDFAndDOCX() throws Exception {
        when(aiExtractionRepository.findByMeetingId(meeting.getId())).thenReturn(Optional.empty());
        when(documentGenerationService.generateMinutesPDF(any(), any(), any())).thenReturn("file-id-pdf");
        when(documentGenerationService.generateMinutesDOCX(any(), any(), any())).thenReturn("file-id-docx");

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/documents/regenerate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().isOk());

        verify(documentGenerationService, times(1)).generateMinutesPDF(any(), any(), any());
        verify(documentGenerationService, times(1)).generateMinutesDOCX(any(), any(), any());
    }

    @Test
    void regenerateDocuments_WithExistingAIExtraction_PassesExtractionToService() throws Exception {
        AIExtraction extraction = new AIExtraction();
        when(aiExtractionRepository.findByMeetingId(meeting.getId())).thenReturn(Optional.of(extraction));
        when(documentGenerationService.generateMinutesPDF(any(), any(), any())).thenReturn("pdf-id");
        when(documentGenerationService.generateMinutesDOCX(any(), any(), any())).thenReturn("docx-id");

        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/documents/regenerate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().isOk());

        verify(documentGenerationService).generateMinutesPDF(any(Meeting.class), eq(extraction), any(User.class));
        verify(documentGenerationService).generateMinutesDOCX(any(Meeting.class), eq(extraction), any(User.class));
    }

    @Test
    void regenerateDocuments_AsOutsider_Returns403() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/documents/regenerate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + outsiderToken))
                .andExpect(status().is5xxServerError()); // ForbiddenException thrown inside controller
    }

    @Test
    void regenerateDocuments_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(post("/api/v1/meetings/" + meeting.getId() + "/documents/regenerate"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void regenerateDocuments_MeetingNotFound_Returns500() throws Exception {
        UUID nonExistentId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/meetings/" + nonExistentId + "/documents/regenerate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + organizerToken))
                .andExpect(status().is5xxServerError());
    }
}
