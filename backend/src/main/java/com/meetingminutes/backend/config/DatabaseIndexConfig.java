package com.meetingminutes.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

@Configuration
public class DatabaseIndexConfig {

    private final MongoMappingContext mongoMappingContext;
    private final MongoTemplate mongoTemplate;

    public DatabaseIndexConfig(MongoMappingContext mongoMappingContext, MongoTemplate mongoTemplate) {
        this.mongoMappingContext = mongoMappingContext;
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void initIndicesAfterStartup() {
        // Spring Data MongoDB handle index creation automatically
        // based on @Indexed annotations in document classes

        System.out.println("MongoDB index auto-creation is enabled via @Indexed annotations");
    }
}
