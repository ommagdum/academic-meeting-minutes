package com.meetingminutes.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();

        // Set timeouts (5 minutes for AI processing)
        factory.setConnectTimeout((int) Duration.ofMinutes(1).toMillis());
        factory.setReadTimeout((int) Duration.ofMinutes(5).toMillis());

        return new RestTemplate(factory);
    }
}
