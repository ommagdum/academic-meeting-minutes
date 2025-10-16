package com.meetingminutes.backend.service;

import com.meetingminutes.backend.entity.ActionItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.base-url}")
    private String baseUrl;

    public void sendMeetingInvitation(Meeting meeting, String email, String inviteToken, String message) {
        try {
            String subject = "Meeting Invitation: " + meeting.getTitle();
            String invitationLink = baseUrl + "/join-meeting?token=" + inviteToken;

            Map<String, Object> variables = new HashMap<>();
            variables.put("meetingTitle", meeting.getTitle());
            variables.put("meetingDescription", meeting.getDescription());
            variables.put("organizerName", meeting.getCreatedBy().getName());
            variables.put("invitationLink", invitationLink);
            variables.put("customMessage", message);
            variables.put("scheduledTime", meeting.getScheduledTime() != null ?
                    meeting.getScheduledTime().format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' HH:mm")) : "Not scheduled");

            String htmlContent = renderTemplate("meeting-invitation", variables);

            sendEmail(email, subject, htmlContent);
            logger.info("Meeting invitation sent to: {}", email);

        } catch (Exception e) {
            logger.error("Failed to send meeting invitation to: {}", email, e);
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    public void sendTaskAssignmentNotification(ActionItem actionItem) {
        if (actionItem.getAssignedToUser() != null) {
            User assignee = actionItem.getAssignedToUser();

            try {
                String subject = "New Action Item Assigned: " + actionItem.getDescription();

                Map<String, Object> variables = new HashMap<>();
                variables.put("taskDescription", actionItem.getDescription());
                variables.put("meetingTitle", actionItem.getMeeting().getTitle());
                variables.put("deadline", actionItem.getDeadline() != null ?
                        actionItem.getDeadline().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")) : "Not set");
                variables.put("priority", getPriorityText(actionItem.getPriority()));
                variables.put("assignerName", actionItem.getMeeting().getCreatedBy().getName());

                String htmlContent = renderTemplate("task-assignment", variables);

                sendEmail(assignee.getEmail(), subject, htmlContent);
                logger.info("Task assignment notification sent to: {}", assignee.getEmail());

            } catch (Exception e) {
                logger.error("Failed to send task assignment notification to: {}", assignee.getEmail(), e);
            }
        }
    }

    public void sendTaskReminder(ActionItem actionItem) {
        if (actionItem.getAssignedToUser() != null) {
            User assignee = actionItem.getAssignedToUser();

            try {
                String subject = "Reminder: Action Item Due - " + actionItem.getDescription();

                Map<String, Object> variables = new HashMap<>();
                variables.put("taskDescription", actionItem.getDescription());
                variables.put("meetingTitle", actionItem.getMeeting().getTitle());
                variables.put("deadline", actionItem.getDeadline().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")));
                variables.put("isOverdue", actionItem.getDeadline().isBefore(java.time.LocalDateTime.now()));

                String htmlContent = renderTemplate("task-reminder", variables);

                sendEmail(assignee.getEmail(), subject, htmlContent);
                logger.info("Task reminder sent to: {}", assignee.getEmail());

            } catch (Exception e) {
                logger.error("Failed to send task reminder to: {}", assignee.getEmail(), e);
            }
        }
    }

    public void sendProcessingCompleteNotification(User user, Meeting meeting) {
        try {
            String subject = "Meeting Processing Complete: " + meeting.getTitle();

            Map<String, Object> variables = new HashMap<>();
            variables.put("meetingTitle", meeting.getTitle());
            variables.put("userName", user.getName());
            variables.put("meetingLink", baseUrl + "/meetings/" + meeting.getId());

            String htmlContent = renderTemplate("processing-complete", variables);

            sendEmail(user.getEmail(), subject, htmlContent);
            logger.info("Processing complete notification sent to: {}", user.getEmail());

        } catch (Exception e) {
            logger.error("Failed to send processing complete notification to: {}", user.getEmail(), e);
        }
    }

    public void sendMeetingReminder(Meeting meeting, String email) {
        try {
            String subject = "Reminder: Upcoming Meeting - " + meeting.getTitle();

            Map<String, Object> variables = new HashMap<>();
            variables.put("meetingTitle", meeting.getTitle());
            variables.put("meetingDescription", meeting.getDescription());
            variables.put("scheduledTime", meeting.getScheduledTime().format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' HH:mm")));
            variables.put("meetingLink", baseUrl + "/meetings/" + meeting.getId());

            String htmlContent = renderTemplate("meeting-reminder", variables);

            sendEmail(email, subject, htmlContent);
            logger.info("Meeting reminder sent to: {}", email);

        } catch (Exception e) {
            logger.error("Failed to send meeting reminder to: {}", email, e);
        }
    }

    private void sendEmail(String to, String subject, String htmlContent) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    private String renderTemplate(String templateName, Map<String, Object> variables) {
        Context context = new Context();
        context.setVariables(variables);
        return templateEngine.process("emails/" + templateName, context);
    }

    private String getPriorityText(Integer priority) {
        if (priority == null) return "Normal";
        switch (priority) {
            case 1: return "Low";
            case 2: return "Normal";
            case 3: return "High";
            default: return "Normal";
        }
    }
}
