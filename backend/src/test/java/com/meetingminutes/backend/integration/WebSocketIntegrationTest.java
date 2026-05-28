package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.entity.UserRole;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import com.meetingminutes.backend.service.JwtService;
import com.meetingminutes.backend.service.MeetingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.lang.reflect.Type;
import java.time.LocalDateTime;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingDeque;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
public class WebSocketIntegrationTest {

    @LocalServerPort
    private Integer port;

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:6.0")
            .withExposedPorts(27017);

    @Container
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
    private UserRepo userRepository;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MeetingService meetingService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.meetingminutes.backend.service.EmailService emailService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private ClientRegistrationRepository clientRegistrationRepository;

    private User user;
    private Meeting meeting;
    private String validToken;
    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        meetingRepository.deleteAll();
        userRepository.deleteAll();

        user = new User();
        user.setEmail("ws-test@example.com");
        user.setName("WS User");
        user.setRole(UserRole.PARTICIPANT);
        user = userRepository.save(user);

        validToken = jwtService.generateToken(user);

        meeting = new Meeting();
        meeting.setTitle("Real-Time Updates Meeting");
        meeting.setCreatedBy(user);
        meeting.setScheduledTime(LocalDateTime.now().plusDays(1));
        meeting.setStatus(MeetingStatus.DRAFT);
        meeting = meetingRepository.save(meeting);

        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
    }

    private String getWsUrl() {
        return "ws://localhost:" + port + "/ws";
    }

    @Test
    void connectWithInvalidJwt_ConnectionRejected() {
        StompHeaders stompHeaders = new StompHeaders();
        stompHeaders.add("Authorization", "Bearer invalid-token-123");

        Exception exception = assertThrows(Exception.class, () -> {
            stompClient.connectAsync(getWsUrl(), new WebSocketHttpHeaders(), stompHeaders, new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
        });

        assertTrue(exception.getMessage().contains("Connection") || exception.getCause() != null);
    }

    @Test
    void connectAndSubscribeWithValidJwt_ReceivesStatusUpdate() throws Exception {
        BlockingQueue<MeetingStatus> blockingQueue = new LinkedBlockingDeque<>();

        StompHeaders stompHeaders = new StompHeaders();
        stompHeaders.add("Authorization", "Bearer " + validToken);

        StompSession session = stompClient
                .connectAsync(getWsUrl(), new WebSocketHttpHeaders(), stompHeaders, new StompSessionHandlerAdapter() {})
                .get(5, TimeUnit.SECONDS);

        // Subscribe to the meeting topic
        String destination = "/topic/meeting/" + meeting.getId();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return byte[].class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                String payloadStr = new String((byte[]) payload);
                if (payloadStr.contains("PROCESSING")) {
                    blockingQueue.add(MeetingStatus.PROCESSING);
                }
            }
        });

        // Give the server a moment to process the SUBSCRIBE frame
        Thread.sleep(1000);

        // Trigger a status update via MeetingService
        meetingService.updateMeetingStatus(meeting.getId(), MeetingStatus.PROCESSING, user);

        // Wait for the broadcasted message
        MeetingStatus receivedStatus = blockingQueue.poll(10, TimeUnit.SECONDS);
        assertNotNull(receivedStatus, "Did not receive STOMP message on topic " + destination);
        assertEquals(MeetingStatus.PROCESSING, receivedStatus);
    }
}
