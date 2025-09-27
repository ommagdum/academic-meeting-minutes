package com.meetingminutes.backend.config;

import com.meetingminutes.backend.filter.JwtAuthFilter;
import com.meetingminutes.backend.service.CustomUserDetailsService;
import com.meetingminutes.backend.service.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtFilterConfig {

    @Bean
    public JwtAuthFilter jwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService userDetailsService) {
        return new JwtAuthFilter(jwtService, userDetailsService);
    }
}