package com.meetingminutes.backend.config;



import java.time.Duration;
//
//@Configuration
//@EnableCaching
public class CacheConfig {
//
//    @Bean
//    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
//        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
//                .entryTtl(Duration.ofMinutes(30))
//                .disableCachingNullValues()
//                .serializeKeysWith(
//                        RedisSerializationContext.SerializationPair
//                                .fromSerializer(new StringRedisSerializer()))
//                .serializeValuesWith(
//                        RedisSerializationContext.SerializationPair
//                                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
//
//        return RedisCacheManager.builder(connectionFactory)
//                .cacheDefaults(defaultConfig)
//                .withCacheConfiguration("meetings", RedisCacheConfiguration.defaultCacheConfig()
//                        .entryTtl(Duration.ofMinutes(10)))
//                .withCacheConfiguration("userProfiles", RedisCacheConfiguration.defaultCacheConfig()
//                        .entryTtl(Duration.ofHours(1)))
//                .withCacheConfiguration("analytics", RedisCacheConfiguration.defaultCacheConfig()
//                        .entryTtl(Duration.ofMinutes(5)))
//                .build();
//    }
}