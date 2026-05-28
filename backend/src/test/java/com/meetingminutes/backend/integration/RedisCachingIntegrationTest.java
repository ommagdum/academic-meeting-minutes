package com.meetingminutes.backend.integration;

import com.meetingminutes.backend.dto.MeetingDetailResponse;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.http.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
public class RedisCachingIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:6.0")
            .withExposedPorts(27017);

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("jwt.secret", () -> "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        registry.add("jwt.expiration", () -> "86400000");
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepo userRepository;

    @Autowired
    private CacheManager cacheManager;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.meetingminutes.backend.service.EmailService emailService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;
    
    @Autowired
    private com.meetingminutes.backend.service.JwtService jwtService;

    private User testUser;
    private String jwtToken;
    private Meeting testMeeting;

    @BeforeEach
    void setUp() {
        meetingRepository.deleteAll();
        userRepository.deleteAll();
        cacheManager.getCache("meetings").clear();

        testUser = new User();
        testUser.setEmail("redis_tester@example.com");
        testUser.setName("Redis Tester");
        testUser.setRole(com.meetingminutes.backend.entity.UserRole.PARTICIPANT);
        testUser = userRepository.save(testUser);

        jwtToken = jwtService.generateToken(testUser);

        testMeeting = new Meeting();
        testMeeting.setTitle("Redis Test Meeting");
        testMeeting.setCreatedBy(testUser);
        testMeeting.setScheduledTime(LocalDateTime.now());
        testMeeting = meetingRepository.save(testMeeting);
    }

    private HttpEntity<Void> getAuthEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        return new HttpEntity<>(headers);
    }

    @Test
    void testCacheHit_AfterFirstFetch() {
        String url = "/api/v1/meetings/" + testMeeting.getId();
        
        // 1. First request should hit DB and populate Redis
        ResponseEntity<MeetingDetailResponse> response1 = restTemplate.exchange(
                url, HttpMethod.GET, getAuthEntity(), MeetingDetailResponse.class);
        
        assertEquals(HttpStatus.OK, response1.getStatusCode());
        assertNotNull(response1.getBody());
        assertEquals("Redis Test Meeting", response1.getBody().getTitle());
        
        // Assert it's in the cache
        assertNotNull(cacheManager.getCache("meetings").get(testMeeting.getId()));

        // 2. Change the meeting title directly in DB (bypassing CacheEvict)
        testMeeting.setTitle("Updated In DB Only");
        meetingRepository.save(testMeeting);

        // 3. Second request should return old title from Redis cache
        ResponseEntity<MeetingDetailResponse> response2 = restTemplate.exchange(
                url, HttpMethod.GET, getAuthEntity(), MeetingDetailResponse.class);
                
        assertEquals(HttpStatus.OK, response2.getStatusCode());
        // Still gets the cached title
        assertEquals("Redis Test Meeting", response2.getBody().getTitle());
    }

    @Test
    void testCacheEvict_OnUpdate() {
        String url = "/api/v1/meetings/" + testMeeting.getId();
        
        // 1. Fetch to populate cache
        restTemplate.exchange(url, HttpMethod.GET, getAuthEntity(), MeetingDetailResponse.class);
        assertNotNull(cacheManager.getCache("meetings").get(testMeeting.getId()));

        // 2. Perform a DELETE request which should trigger @CacheEvict
        restTemplate.exchange(url, HttpMethod.DELETE, getAuthEntity(), String.class);

        // 3. Assert it's removed from the cache
        assertNull(cacheManager.getCache("meetings").get(testMeeting.getId()));
    }

    @Test
    void testGracefulDegradation_WhenRedisCrashes() {
        String url = "/api/v1/meetings/" + testMeeting.getId();
        
        // 1. Initial fetch to populate cache
        restTemplate.exchange(url, HttpMethod.GET, getAuthEntity(), MeetingDetailResponse.class);

        // 2. Kill the Redis container
        redis.stop();

        try {
            // 3. Fetch again. Redis is down, so cache get fails.
            // With CustomCacheErrorHandler, it should log a warning and fall back to DB.
            ResponseEntity<MeetingDetailResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, getAuthEntity(), MeetingDetailResponse.class);
            
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("Redis Test Meeting", response.getBody().getTitle());
        } finally {
            // 4. Start it back up so other tests don't fail if they run after this
            redis.start();
        }
    }
}
