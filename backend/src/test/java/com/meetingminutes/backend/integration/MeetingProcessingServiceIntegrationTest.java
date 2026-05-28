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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.main.allow-bean-definition-overriding=true",
        "app.oauth2.redirect-uri=http://localhost:5173/auth/callback",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
public class MeetingProcessingServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static org.testcontainers.containers.MongoDBContainer mongoDBContainer = new org.testcontainers.containers.MongoDBContainer("mongo:6.0")
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
    private ActionItemRepo actionItemRepo;

    @MockBean
    private TranscriptRepository transcriptRepository;

    @MockBean
    private AIExtractionRepository aiExtractionRepository;

    @MockBean
    private FileUploadService fileUploadService;

    @MockBean
    private EmailService emailService;

    @MockBean
    private DocumentGenerationService documentGenerationService;

    @MockBean
    private AIServiceClient aiServiceClient;

    @MockBean
    private WebSocketEventPublisher webSocketEventPublisher;

    @MockBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    private User testUser;
    private Meeting testMeeting;

    @BeforeEach
    void setUp() {
        actionItemRepo.deleteAll();
        meetingRepository.deleteAll();
        userRepo.deleteAll();

        testUser = new User();
        testUser.setEmail("test@example.com");
        testUser.setName("Test User");
        testUser.setRole(UserRole.OWNER);
        testUser.setAuthProvider(AuthProvider.LOCAL);
        testUser.setPasswordHash("hash");
        testUser = userRepo.save(testUser);

        testMeeting = new Meeting();
        testMeeting.setTitle("Integration Test Meeting");
        testMeeting.setStatus(MeetingStatus.DRAFT);
        testMeeting.setCreatedBy(testUser);
        testMeeting.setAudioFilePath("/tmp/audio.mp3");
        testMeeting = meetingRepository.save(testMeeting);

        when(fileUploadService.isValidFilePath(anyString())).thenReturn(true);
    }

    @Test
    void processMeeting_Success_EndToEnd() throws Exception {
        // Arrange
        TranscriptionResponse transcriptionResponse = new TranscriptionResponse();
        transcriptionResponse.setSuccess(true);
        transcriptionResponse.setRawText("Meeting transcript");
        when(aiServiceClient.transcribeAudio(anyString(), any(UUID.class))).thenReturn(transcriptionResponse);
        when(transcriptRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(transcriptRepository.findByMeetingId(testMeeting.getId())).thenReturn(Optional.empty());

        ExtractionResponse extractionResponse = new ExtractionResponse();
        extractionResponse.setSuccess(true);
        ExtractedData data = new ExtractedData();
        ExtractedData.ExtractedActionItem actionItem = new ExtractedData.ExtractedActionItem();
        actionItem.setDescription("Test task");
        actionItem.setAssignedTo("test@example.com");
        data.setActionItems(List.of(actionItem));
        extractionResponse.setExtractedData(data);
        when(aiServiceClient.extractInformation(any(ExtractionRequest.class))).thenReturn(extractionResponse);
        when(aiExtractionRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(aiExtractionRepository.findByMeetingId(testMeeting.getId())).thenReturn(Optional.empty());

        // Act
        CompletableFuture<Void> future = meetingProcessingService.processMeeting(testMeeting.getId(), testUser);
        future.join(); // Wait for async completion

        // Assert
        Meeting updatedMeeting = meetingRepository.findById(testMeeting.getId()).orElseThrow();
        assertEquals(MeetingStatus.PROCESSED, updatedMeeting.getStatus());
        assertNotNull(updatedMeeting.getActualStartTime());
        assertNotNull(updatedMeeting.getActualEndTime());

        List<ActionItem> actionItems = actionItemRepo.findByMeetingId(testMeeting.getId());
        assertEquals(1, actionItems.size());
        assertEquals("Test task", actionItems.get(0).getDescription());
        assertEquals(testUser.getId(), actionItems.get(0).getAssignedToUser().getId());

        verify(documentGenerationService).generateMinutesPDF(any(), any(), any());
        verify(emailService).sendProcessingCompleteNotification(any(), any());
    }

    @Test
    void processMeeting_FailsMidway_TransactionRollback() {
        // Arrange
        TranscriptionResponse transcriptionResponse = new TranscriptionResponse();
        transcriptionResponse.setSuccess(true);
        transcriptionResponse.setRawText("Meeting transcript");
        when(aiServiceClient.transcribeAudio(anyString(), any(UUID.class))).thenReturn(transcriptionResponse);
        when(transcriptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // Simulate failure during extraction
        when(aiServiceClient.extractInformation(any(ExtractionRequest.class)))
                .thenThrow(new RuntimeException("AI API Timeout"));

        // Act
        CompletableFuture<Void> future = meetingProcessingService.processMeeting(testMeeting.getId(), testUser);
        
        // Assert
        Exception exception = assertThrows(Exception.class, future::join);
        assertTrue(exception.getMessage().contains("AI API Timeout"));

        Meeting updatedMeeting = meetingRepository.findById(testMeeting.getId()).orElseThrow();
        assertEquals(MeetingStatus.FAILED, updatedMeeting.getStatus());
        assertNotNull(updatedMeeting.getActualEndTime()); // Set on failure

        List<ActionItem> actionItems = actionItemRepo.findByMeetingId(testMeeting.getId());
        assertTrue(actionItems.isEmpty(), "No action items should be saved if processing fails");
    }

    @Test
    void concurrentStatusUpdates_OptimisticLocking() throws Exception {
        // Retrieve two instances of the same meeting to simulate concurrent transactions
        Meeting instance1 = meetingRepository.findById(testMeeting.getId()).orElseThrow();
        Meeting instance2 = meetingRepository.findById(testMeeting.getId()).orElseThrow();

        // Transaction 1 updates status to PROCESSING
        instance1.setStatus(MeetingStatus.PROCESSING);
        meetingRepository.save(instance1);

        // Transaction 2 tries to update status to FAILED concurrently
        instance2.setStatus(MeetingStatus.FAILED);
        
        assertThrows(org.springframework.orm.ObjectOptimisticLockingFailureException.class, () -> {
            meetingRepository.save(instance2); // Should throw OptimisticLockException due to @Version mismatch
        });
    }
}
