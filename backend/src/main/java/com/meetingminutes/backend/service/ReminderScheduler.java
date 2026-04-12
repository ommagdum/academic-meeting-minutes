package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.MeetingStatus;
import com.meetingminutes.backend.repository.ActionItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final MeetingRepository meetingRepository;
    private final ActionItemRepo actionItemRepo;
    private final EmailService emailService;

    // Runs every day at 8am
    @Scheduled(cron = "0 0 8 * * *")
    public void sendUpcomingMeetingReminders() {
        log.info("Running upcoming meeting reminder job");

        LocalDateTime windowStart = LocalDateTime.now();
        LocalDateTime windowEnd = windowStart.plusHours(24);

        List<Meeting> upcomingMeetings = meetingRepository
                .findMeetingsBetweenDates(windowStart, windowEnd)
                .stream()
                .filter(m -> m.getStatus() == MeetingStatus.SCHEDULED ||
                        m.getStatus() == MeetingStatus.DRAFT)
                .toList();

        for (Meeting meeting : upcomingMeetings) {
            meeting.getAttendees().forEach(attendee -> {
                String email = attendee.getUser() != null
                        ? attendee.getUser().getEmail()
                        : attendee.getInviteEmail();
                if (email != null) {
                    emailService.sendMeetingReminder(meeting, email);
                }
            });
        }

        log.info("Sent reminders for {} upcoming meetings", upcomingMeetings.size());
    }

    // Runs every Monday at 9am
    @Scheduled(cron = "0 0 9 * * MON")
    public void sendOverdueTaskReminders() {
        log.info("Running overdue task reminder job");

        List<ActionItem> overdueItems = actionItemRepo
                .findOverdueActionItems(LocalDateTime.now());

        overdueItems.forEach(emailService::sendTaskReminder);

        log.info("Sent reminders for {} overdue tasks", overdueItems.size());
    }
}