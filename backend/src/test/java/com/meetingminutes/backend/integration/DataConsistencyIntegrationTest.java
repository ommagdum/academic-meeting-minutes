package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.ExtractedData;
import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.dto.ai.ExtractionRequest;
import com.meetingminutes.backend.dto.ai.ExtractionResponse;
import com.meetingminutes.backend.dto.ai.TranscriptionResponse;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import com.meetingminutes.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.main.allow-bean-definition-overriding=true",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
public class DataConsistencyIntegrationTest {

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

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("jwt.secret", () -> "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        registry.add("jwt.expiration", () -> "86400000");
    }

    @Autowired
    private MeetingProcessingService meetingProcessingService;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private TranscriptRepository transcriptRepository;

    @Autowired
    private AIExtractionRepository aiExtractionRepository;

    // Use MockitoBean to simulate Postgres data integrity violation specifically on save
    @MockitoBean
    private ActionItemRepo actionItemRepo;

    @MockitoBean
    private FileUploadService fileUploadService;

    @MockitoBean
    private AIServiceClient aiServiceClient;

    @MockitoBean
    private WebSocketEventPublisher webSocketEventPublisher;

    @MockitoBean
    private DocumentGenerationService documentGenerationService;

    @MockitoBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    @MockitoBean
    private EmailService emailService;

    @MockitoBean
    private org.springframework.data.redis.connection.RedisConnectionFactory redisConnectionFactory;

    private User testUser;
    private Meeting testMeeting;

    @BeforeEach
    void setUp() {
        meetingRepository.deleteAll();
        userRepo.deleteAll();
        transcriptRepository.deleteAll();
        aiExtractionRepository.deleteAll();

        testUser = new User();
        testUser.setEmail("consistency@example.com");
        testUser.setName("Consistency User");
        testUser.setRole(UserRole.OWNER);
        testUser.setAuthProvider(AuthProvider.LOCAL);
        testUser.setPasswordHash("hash");
        testUser = userRepo.save(testUser);

        testMeeting = new Meeting();
        testMeeting.setTitle("Consistency Test Meeting");
        testMeeting.setStatus(MeetingStatus.DRAFT);
        testMeeting.setCreatedBy(testUser);
        testMeeting.setAudioFilePath("/tmp/audio.mp3");
        testMeeting = meetingRepository.save(testMeeting);

        when(fileUploadService.isValidFilePath(anyString())).thenReturn(true);
    }

    @Test
    void postgresSaveFails_MongoDocumentsCleanedUp() {
        // Arrange
        UUID meetingId = testMeeting.getId();

        // 1. Mock AI Transcription to return success
        TranscriptionResponse transcriptionResponse = new TranscriptionResponse();
        transcriptionResponse.setSuccess(true);
        transcriptionResponse.setRawText("This is a meeting transcript.");
        when(aiServiceClient.transcribeAudio(anyString(), any(UUID.class))).thenReturn(transcriptionResponse);

        // 2. Mock AI Extraction to return success
        ExtractionResponse extractionResponse = new ExtractionResponse();
        extractionResponse.setSuccess(true);
        ExtractedData data = new ExtractedData();
        ExtractedData.ExtractedActionItem actionItem = new ExtractedData.ExtractedActionItem();
        actionItem.setDescription("Test task");
        data.setActionItems(List.of(actionItem));
        extractionResponse.setExtractedData(data);
        when(aiServiceClient.extractInformation(any(ExtractionRequest.class))).thenReturn(extractionResponse);

        // 3. Mock ActionItemRepo (Postgres) to throw an exception
        when(actionItemRepo.save(any(ActionItem.class)))
                .thenThrow(new DataIntegrityViolationException("Simulated Postgres constraint violation"));

        // Act
        CompletableFuture<Void> future = meetingProcessingService.processMeeting(meetingId, testUser);

        // Assert
        Exception exception = assertThrows(Exception.class, future::join);
        assertTrue(exception.getMessage().contains("Simulated Postgres constraint violation") ||
                   exception.getCause() instanceof DataIntegrityViolationException);

        // Verify PostgreSQL Meeting state was set to FAILED
        Meeting updatedMeeting = meetingRepository.findById(meetingId).orElseThrow();
        assertEquals(MeetingStatus.FAILED, updatedMeeting.getStatus(), "Meeting status should be updated to FAILED");

        // Verify MongoDB Compensation: No orphaned documents should exist!
        Optional<Transcript> savedTranscript = transcriptRepository.findByMeetingId(meetingId);
        assertTrue(savedTranscript.isEmpty(), "Transcript should have been deleted from MongoDB during compensation");

        Optional<AIExtraction> savedExtraction = aiExtractionRepository.findByMeetingId(meetingId);
        assertTrue(savedExtraction.isEmpty(), "AI Extraction should have been deleted from MongoDB during compensation");
    }
}
