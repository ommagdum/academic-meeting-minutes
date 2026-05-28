package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.document.AIExtraction;
import com.meetingminutes.backend.document.GeneratedDocument;
import com.meetingminutes.backend.document.Transcript;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.repository.mongo.AIExtractionRepository;
import com.meetingminutes.backend.repository.mongo.TranscriptRepository;
import com.meetingminutes.backend.service.DocumentGenerationService;
import com.meetingminutes.backend.service.EmailService;
import com.meetingminutes.backend.service.MeetingService;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.main.allow-bean-definition-overriding=true",
        "app.oauth2.redirect-uri=http://localhost:5173/auth/callback",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
public class DocumentStorageIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
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
    private TranscriptRepository transcriptRepository;

    @Autowired
    private AIExtractionRepository aiExtractionRepository;

    @Autowired
    private GridFsTemplate gridFsTemplate;

    @Autowired
    private MeetingService meetingService;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private DocumentGenerationService documentGenerationService;

    @MockBean
    private EmailService emailService;

    // We mock OAuth2 because it's required for context loading
    @MockBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;

    private User testUser;
    private Meeting testMeeting;

    @BeforeEach
    void setUp() {
        transcriptRepository.deleteAll();
        aiExtractionRepository.deleteAll();
        meetingRepository.deleteAll();
        userRepo.deleteAll();

        testUser = new User();
        testUser.setEmail("test-mongo@example.com");
        testUser.setName("Mongo Test User");
        testUser.setRole(UserRole.OWNER);
        testUser.setPasswordHash("hash");
        testUser = userRepo.save(testUser);

        testMeeting = new Meeting();
        testMeeting.setTitle("Mongo Integration Test Meeting");
        testMeeting.setStatus(MeetingStatus.PROCESSED);
        testMeeting.setCreatedBy(testUser);
        testMeeting.setAttendees(java.util.List.of());
        testMeeting.setActionItems(java.util.List.of());
        testMeeting = meetingRepository.save(testMeeting);
    }

    @Test
    void saveAndRetrieveMassiveTranscript() {
        // Arrange
        // Create a huge string (e.g., 5MB string)
        StringBuilder hugeText = new StringBuilder();
        for (int i = 0; i < 100000; i++) {
            hugeText.append("This is a line of transcript text. ");
        }
        
        Transcript transcript = new Transcript();
        transcript.setMeetingId(testMeeting.getId());
        transcript.setRawText(hugeText.toString());
        transcript.setCreatedAt(LocalDateTime.now());
        
        // Act
        transcript = transcriptRepository.save(transcript);
        
        // Assert
        Transcript retrieved = transcriptRepository.findByMeetingId(testMeeting.getId()).orElseThrow();
        assertEquals(hugeText.toString(), retrieved.getRawText());
    }
    
    @Test
    void deleteMeeting_CascadesToMongoDB() {
        // Arrange
        Transcript transcript = new Transcript();
        transcript.setMeetingId(testMeeting.getId());
        transcript.setRawText("Hello");
        transcriptRepository.save(transcript);
        
        AIExtraction extraction = new AIExtraction();
        extraction.setMeetingId(testMeeting.getId());
        extraction.setSuccess(true);
        aiExtractionRepository.save(extraction);
        
        assertTrue(transcriptRepository.existsByMeetingId(testMeeting.getId()));
        
        // Act
        meetingService.deleteMeeting(testMeeting.getId(), testUser);
        
        // Assert
        assertFalse(meetingRepository.findById(testMeeting.getId()).isPresent(), "Meeting should be deleted in PostgreSQL");
        assertFalse(transcriptRepository.existsByMeetingId(testMeeting.getId()), "Transcript should be deleted in MongoDB");
        assertFalse(aiExtractionRepository.findByMeetingId(testMeeting.getId()).isPresent(), "Extraction should be deleted in MongoDB");
    }

    @Test
    void generateAndStorePDFMinutes_GridFS() throws Exception {
        // Arrange
        // (Create some mock data or pass minimal extraction)
        AIExtraction extraction = new AIExtraction();
        extraction.setMeetingId(testMeeting.getId());
        // Since DocumentGenerationService actually uses Thymeleaf and FlyingSaucer, 
        // we can just call generateMinutesPDF and verify it stores bytes in GridFS.
        
        // Act
        String fileId = documentGenerationService.generateMinutesPDF(testMeeting, extraction, testUser);
        
        // Assert
        assertNotNull(fileId, "GridFS fileId should not be null");
        
        // Retrieve from GridFS
        org.springframework.data.mongodb.gridfs.GridFsResource resource = documentGenerationService.getDocumentById(fileId);
        assertNotNull(resource, "Resource should exist in GridFS");
        
        byte[] pdfBytes = resource.getInputStream().readAllBytes();
        assertTrue(pdfBytes.length > 0, "PDF byte array should not be empty");
        
        // Also verify metadata
        java.util.List<GeneratedDocument> docs = documentGenerationService.getMeetingDocuments(testMeeting.getId());
        assertEquals(1, docs.size(), "Should have exactly 1 generated document metadata record");
        assertEquals(fileId, docs.get(0).getId());
    }
}
