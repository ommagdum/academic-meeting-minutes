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

    public List<MeetingSeries> getUserSeries(User user) {
        return meetingSeriesRepo.findByCreatedByOrderByCreatedAtDesc(user);
    }

    public List<Meeting> getMeetingsInSeries(UUID seriesId, User user) {
        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
                .orElseThrow(() -> new RuntimeException("Meeting series not found"));

        if (!series.getCreatedBy().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to this meeting series");
        }

        return meetingRepository.findBySeriesIdOrderByCreatedAtDesc(seriesId);
    }

    public MeetingSeries createSeries(String title, String description, User user) {
        MeetingSeries series = new MeetingSeries();
        series.setTitle(title);
        series.setDescription(description);
        series.setCreatedBy(user);
        series.setIsActive(true);
        return meetingSeriesRepo.save(series);
    }

    public void deleteSeries(UUID seriesId, User user) {
        MeetingSeries series = meetingSeriesRepo.findByIdAndCreatedBy(seriesId, user)
                .orElseThrow(() -> new RuntimeException("Meeting series not found or access denied"));

        // Check if there are meetings in the series
        if (!series.getMeetings().isEmpty()) {
            throw new RuntimeException("Cannot delete series with existing meetings");
        }

        meetingSeriesRepo.delete(series);
    }

    public MeetingSeries updateSeries(UUID seriesId, String title, String description, User user) {
        MeetingSeries series = meetingSeriesRepo.findByIdAndCreatedBy(seriesId, user)
                .orElseThrow(() -> new RuntimeException("Meeting series not found or access denied"));

        series.setTitle(title);
        series.setDescription(description);
        return meetingSeriesRepo.save(series);
    }

    public List<MeetingSeriesResponse> getUserSeriesWithRecentMeetings(User user, int recentMeetingsLimit) {
        List<MeetingSeries> seriesList = meetingSeriesRepo.findByCreatedByOrderByCreatedAtDesc(user);

        return seriesList.stream()
                .map(series -> {
                    // Get recent meetings for this series
                    List<Meeting> recentMeetings = meetingRepository
                            .findBySeriesIdOrderByCreatedAtDesc(series.getId())
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
}

//    public MeetingSeries createMeetingSeries(String title, String description, User user) {
//        log.info("Creating new meeting series: {} for user: {}", title, user.getEmail());
//
//        MeetingSeries series = new MeetingSeries();
//        series.setTitle(title);
//        series.setDescription(description);
//        series.setCreatedBy(user);
//        series.setIsActive(true);
//
//        MeetingSeries savedSeries = meetingSeriesRepo.save(series);
//        log.info("Meeting series created successfully: {}", savedSeries.getId());
//
//        return savedSeries;
//    }
//
//    public MeetingSeries getSeriesWithMeetings(UUID seriesId, User user) {
//        log.info("Fetching series with meetings: {} for user: {}", seriesId, user.getEmail());
//
//        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
//                .orElseThrow(() -> new RuntimeException("Meeting series not found "));
//
//        if(!series.getCreatedBy().getId().equals(user.getId())) {
//            throw new RuntimeException("Access denied to this meeting series");
//        }
//
//        List<Meeting> meetings = meetingRepository.findBySeriesIdOrderByCreatedAtDesc(seriesId);
//        return series;
//    }
//
//    public Optional<Meeting> getPreviousMeetingContext(UUID currentMeetingId, User user) {
//        log.info("Fetching previous meeting context for: {}", currentMeetingId);
//
//        Meeting currentMeeting = meetingRepository.findById(currentMeetingId)
//                .orElseThrow(() -> new RuntimeException("Current meeting not found"));
//
//        if (!hasAccessToMeeting(currentMeeting, user)) {
//            throw new RuntimeException("Access denied to this meeting");
//        }
//
//        if(currentMeeting.getSeries() == null) {
//            return Optional.empty();
//        }
//
//        List<Meeting> previousMeetings = meetingRepository.findProcessedMeetingsInSeries(
//                currentMeeting.getSeries().getId()
//        );
//
//        return previousMeetings.stream()
//                .filter(meeting -> meeting.getCreatedAt().isBefore(currentMeeting.getCreatedAt())).findFirst();
//    }
//
//    public List<MeetingSeries> getUserSeries(User user, Boolean activeOnly) {
//        log.info("Fetching meeting series for user: {}, activeOnly: {}", user.getEmail(), activeOnly);
//
//        if (activeOnly != null && activeOnly) {
//            return meetingSeriesRepo.findByCreatedByAndIsActive(user, true);
//        }
//
//        return meetingSeriesRepo.findByCreatedBy(user);
//    }
//
//    public MeetingSeries updateMeetingSeries(UUID seriesId, String title, String description, Boolean isActive, User user) {
//        log.info("Updating meeting series: {}", seriesId);
//        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
//                .orElseThrow(() -> new RuntimeException("Meeting series not found"));
//
//        if (!series.getCreatedBy().getId().equals(user.getId())) {
//            throw new RuntimeException("Access denied to update this meeting series");
//        }
//
//        if(title != null && !title.trim().isEmpty()) {
//            series.setTitle(title);
//        }
//
//        if (description != null) {
//            series.setDescription(description);
//        }
//
//        if (isActive != null) {
//            series.setIsActive(isActive);
//        }
//
//        MeetingSeries updatedSeries = meetingSeriesRepo.save(series);
//        log.info("Meeting series updated successfully: {}", seriesId);
//
//        return updatedSeries;
//    }
//
//    public void deactivateMeetingSeries(UUID seriesId, User user) {
//        log.info("Deactivating meeting series: {}", seriesId);
//
//        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
//                .orElseThrow(() -> new RuntimeException("Meeting series not found"));
//
//        if (!series.getCreatedBy().getId().equals(user.getId())) {
//            throw new RuntimeException("Access denied to deactivate this meeting series");
//        }
//
//        series.setIsActive(false);
//        meetingSeriesRepo.save(series);
//
//        log.info("Meeting series deactivated successfully: {}", seriesId);
//    }
//
//
//
//    public SeriesStats getSeriesStats(UUID seriesId, User user) {
//        MeetingSeries series = meetingSeriesRepo.findById(seriesId)
//                .orElseThrow(() -> new RuntimeException("Meeting series not found"));
//
//        if (!series.getCreatedBy().getId().equals(user.getId())) {
//            throw new RuntimeException("Access denied to this meeting series");
//        }
//
//        List<Meeting> seriesMeetings = meetingRepository.findBySeriesIdOrderByCreatedAtDesc(seriesId);
//
//        long totalMeetings = seriesMeetings.size();
//        long processedMeetings = seriesMeetings.stream()
//                .filter(meeting -> meeting.getStatus().name().equals("PROCESSED"))
//                .count();
//
//        return new SeriesStats(totalMeetings, processedMeetings);
//    }
//
//    public record SeriesStats(long totalMeetings, long processedMeetings) {}
//
//    private boolean hasAccessToMeeting(Meeting meeting, User user) {
//        return meeting.getCreatedBy().getId().equals(user.getId());
//    }
