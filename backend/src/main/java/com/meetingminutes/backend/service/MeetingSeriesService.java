package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.MeetingSeriesResponse;
import com.meetingminutes.backend.dto.MeetingSummaryResponse;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingSeries;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.MeetingRepository;
import com.meetingminutes.backend.repository.MeetingSeriesRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class MeetingSeriesService {

    private final MeetingSeriesRepo meetingSeriesRepo;
    private final MeetingRepository meetingRepository;

    // ✅ FIXED: Get series user created OR is attending meetings in
    public List<MeetingSeries> getUserSeries(User user) {
        return meetingSeriesRepo.findByCreatedByOrAttendeeOrderByCreatedAtDesc(user);
    }

    // ✅ FIXED: Allow access if user is attendee of any meeting in the series
    public List<Meeting> getMeetingsInSeries(UUID seriesId, User user) {
        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
                .orElseThrow(() -> new RuntimeException("Meeting series not found"));

        // Check if user is series creator OR attendee of any meeting in the series
        if (!series.getCreatedBy().getId().equals(user.getId()) &&
                !isUserAttendeeInSeries(seriesId, user)) {
            throw new RuntimeException("Access denied to this meeting series");
        }

        // ✅ FIXED: Use method that includes meetings user can access
        return meetingRepository.findBySeriesIdAndUserOrAttendee(seriesId, user);
    }

    public MeetingSeries createSeries(String title, String description, User user) {
        MeetingSeries series = new MeetingSeries();
        series.setTitle(title);
        series.setDescription(description);
        series.setCreatedBy(user);
        series.setIsActive(true);
        return meetingSeriesRepo.save(series);
    }

    // ✅ FIXED: Only allow deletion if user is the creator
    public void deleteSeries(UUID seriesId, User user) {
        MeetingSeries series = meetingSeriesRepo.findByIdAndCreatedBy(seriesId, user)
                .orElseThrow(() -> new RuntimeException("Meeting series not found or access denied"));

        // Check if there are meetings in the series
        if (!series.getMeetings().isEmpty()) {
            throw new RuntimeException("Cannot delete series with existing meetings");
        }

        meetingSeriesRepo.delete(series);
    }

    // ✅ FIXED: Only allow updates if user is the creator
    public MeetingSeries updateSeries(UUID seriesId, String title, String description, User user) {
        MeetingSeries series = meetingSeriesRepo.findByIdAndCreatedBy(seriesId, user)
                .orElseThrow(() -> new RuntimeException("Meeting series not found or access denied"));

        series.setTitle(title);
        series.setDescription(description);
        return meetingSeriesRepo.save(series);
    }

    // ✅ FIXED: Include series where user is attending meetings
    public List<MeetingSeriesResponse> getUserSeriesWithRecentMeetings(User user, int recentMeetingsLimit) {
        List<MeetingSeries> seriesList = meetingSeriesRepo.findByCreatedByOrAttendeeOrderByCreatedAtDesc(user);

        return seriesList.stream()
                .map(series -> {
                    // ✅ FIXED: Get meetings user can access in this series
                    List<Meeting> recentMeetings = meetingRepository
                            .findBySeriesIdAndUserOrAttendee(series.getId(), user)
                            .stream()
                            .limit(recentMeetingsLimit)
                            .toList();

                    // Convert to summary responses
                    List<MeetingSummaryResponse> recentMeetingResponses = recentMeetings.stream()
                            .map(meeting -> MeetingSummaryResponse.builder()
                                    .id(meeting.getId())
                                    .title(meeting.getTitle())
                                    .status(meeting.getStatus())
                                    .scheduledTime(meeting.getScheduledTime())
                                    .createdAt(meeting.getCreatedAt())
                                    .build())
                            .toList();

                    // Create response with recent meetings
                    return MeetingSeriesResponse.withRecentMeetings(series, recentMeetingResponses);
                })
                .toList();
    }

    // ✅ NEW: Check if user is attendee in any meeting of the series
    private boolean isUserAttendeeInSeries(UUID seriesId, User user) {
        return meetingRepository.existsBySeriesIdAndAttendee(seriesId, user);
    }

    // ✅ NEW: Get previous meeting context including attended meetings
    public Optional<Meeting> getPreviousMeetingContext(UUID currentMeetingId, User user) {
        log.info("Fetching previous meeting context for: {}", currentMeetingId);

        Meeting currentMeeting = meetingRepository.findById(currentMeetingId)
                .orElseThrow(() -> new RuntimeException("Current meeting not found"));

        if (!hasAccessToMeeting(currentMeeting, user)) {
            throw new RuntimeException("Access denied to this meeting");
        }

        if (currentMeeting.getSeries() == null) {
            return Optional.empty();
        }

        // ✅ FIXED: Get processed meetings user can access in the series
        List<Meeting> previousMeetings = meetingRepository.findProcessedMeetingsInSeriesForUserOrAttendee(
                currentMeeting.getSeries().getId(), user
        );

        return previousMeetings.stream()
                .filter(meeting -> meeting.getCreatedAt().isBefore(currentMeeting.getCreatedAt()))
                .findFirst();
    }

    // ✅ FIXED: Updated access control to include attendees
    private boolean hasAccessToMeeting(Meeting meeting, User user) {
        // User is creator
        if (meeting.getCreatedBy().getId().equals(user.getId())) {
            return true;
        }

        // User is attendee
        return meetingRepository.isUserAttendeeOfMeeting(meeting.getId(), user.getId());
    }
}