package com.meetingminutes.backend.config;

import com.meetingminutes.backend.service.CustomUserDetailsService;
import com.meetingminutes.backend.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null) {
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        List<String> authorization = accessor.getNativeHeader("Authorization");
                        if (authorization != null && !authorization.isEmpty()) {
                            String authHeader = authorization.get(0);
                            if (authHeader.startsWith("Bearer ")) {
                                String token = authHeader.substring(7);
                                try {
                                    String userEmail = jwtService.extractUsername(token);
                                    if (userEmail != null) {
                                        UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);
                                        if (jwtService.isTokenValid(token, userDetails)) {
                                            UsernamePasswordAuthenticationToken authentication =
                                                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                            accessor.setUser(authentication);
                                            // Store it in the session attributes for subsequent frames
                                            if (accessor.getSessionAttributes() != null) {
                                                accessor.getSessionAttributes().put("USER_AUTH", authentication);
                                            }
                                        } else {
                                            throw new org.springframework.security.access.AccessDeniedException("Invalid JWT token");
                                        }
                                    }
                                } catch (Exception e) {
                                    throw new org.springframework.security.access.AccessDeniedException("Invalid JWT token");
                                }
                            }
                        } else {
                            throw new org.springframework.security.access.AccessDeniedException("Missing JWT token in STOMP headers");
                        }
                    } else if (accessor.getSessionAttributes() != null && accessor.getSessionAttributes().containsKey("USER_AUTH")) {
                        // Restore the authentication from session attributes for subsequent frames
                        accessor.setUser((UsernamePasswordAuthenticationToken) accessor.getSessionAttributes().get("USER_AUTH"));
                    }
                    return org.springframework.messaging.support.MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
                }
                return message;
            }
        });
    }

}
