package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.Meeting;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface MeetingRepositoryCustom {
    Page<Meeting> fullTextSearchWithDynamicSort(UUID userId, String query, String sortField, String sortDirection, Pageable pageable);
}
