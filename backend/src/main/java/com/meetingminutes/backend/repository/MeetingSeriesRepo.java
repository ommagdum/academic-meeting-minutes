package com.meetingminutes.backend.repository;

import com.meetingminutes.backend.entity.MeetingSeries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MeetingSeriesRepo extends JpaRepository<MeetingSeries, UUID> {
}
