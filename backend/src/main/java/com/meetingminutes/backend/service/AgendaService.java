package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.CreateAgendaItemRequest;
import com.meetingminutes.backend.entity.AgendaItem;
import com.meetingminutes.backend.entity.Meeting;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.repository.AgendaItemRepo;
import com.meetingminutes.backend.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class AgendaService {

    private final AgendaItemRepo agendaItemRepo;
    private final MeetingRepository meetingRepository;

    public AgendaItem createAgendaItem(CreateAgendaItemRequest request, UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("Meeting not found"));

        if (!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to add agenda items to this meeting");
        }

        AgendaItem agendaItem = new AgendaItem();
        agendaItem.setMeeting(meeting);
        agendaItem.setTitle(request.getTitle());
        agendaItem.setDescription(request.getDescription());
        agendaItem.setEstimatedDuration(request.getEstimatedDuration());
        agendaItem.setOrderIndex(getNextOrderIndex(meetingId));

        return agendaItemRepo.save(agendaItem);
    }

    public List<AgendaItem> createAgendaItems(Meeting meeting, List<CreateAgendaItemRequest> agendaItemRequests) {
        List<AgendaItem> agendaItems = agendaItemRequests.stream()
                .map(request -> {
                    AgendaItem agendaItem = new AgendaItem();
                    agendaItem.setMeeting(meeting);
                    agendaItem.setTitle(request.getTitle());
                    agendaItem.setDescription(request.getDescription());
                    agendaItem.setEstimatedDuration(request.getEstimatedDuration());
                    agendaItem.setOrderIndex(agendaItemRequests.indexOf(request));
                    return agendaItem;
                })
                .toList();

        return agendaItemRepo.saveAll(agendaItems);
    }

    public AgendaItem updateAgendaItem(UUID agendaItemId, CreateAgendaItemRequest request, User user) {
        AgendaItem agendaItem = agendaItemRepo.findById(agendaItemId)
                .orElseThrow(() -> new IllegalArgumentException("Agenda item not found"));

        Meeting meeting = agendaItem.getMeeting();
        if (!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to update this meeting's agenda");
        }

        agendaItem.setTitle(request.getTitle());
        agendaItem.setDescription(request.getDescription());
        agendaItem.setEstimatedDuration(request.getEstimatedDuration());

        return agendaItemRepo.save(agendaItem);
    }

    public void deleteAgendaItem(UUID agendaItemId, User user) {
        AgendaItem agendaItem = agendaItemRepo.findById(agendaItemId)
                .orElseThrow(() -> new IllegalArgumentException("Agenda item not found"));

        Meeting meeting = agendaItem.getMeeting();
        if (!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to delete this meeting's agenda");
        }

        agendaItemRepo.delete(agendaItem);

        // Reorder remaining agenda items
        reorderAgendaItems(meeting.getId());
    }

    private void reorderAgendaItems(UUID meetingId) {
        List<AgendaItem> agendaItems = agendaItemRepo.findByMeetingIdOrderByOrderIndexAsc(meetingId);

        for (int i = 0; i < agendaItems.size(); i++) {
            agendaItems.get(i).setOrderIndex(i);
        }

        agendaItemRepo.saveAll(agendaItems);
    }

    private Integer getNextOrderIndex(UUID meetingId) {
        List<AgendaItem> existingItems = agendaItemRepo.findByMeetingIdOrderByOrderIndexAsc(meetingId);
        return existingItems.isEmpty() ? 0 : existingItems.get(existingItems.size() - 1).getOrderIndex() + 1;
    }

    public List<AgendaItem> getMeetingAgenda(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("Meeting not found"));

        if(!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to view this meeting's agenda");
        }

        return agendaItemRepo.findByMeetingIdOrderByOrderIndexAsc(meetingId);
    }

    public AgendaItem updateAgendaItem(UUID agendaItemId, String discussionSummary, Boolean completed, User user) {
        AgendaItem agendaItem = agendaItemRepo.findById(agendaItemId)
                .orElseThrow(() -> new IllegalArgumentException("Agenda item not found"));

        Meeting meeting = agendaItem.getMeeting();
        if (!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to update this meeting's agenda");
        }

        if(discussionSummary != null) {
            agendaItem.setDiscussionSummary(discussionSummary);
        }

        if(completed != null) {
            agendaItem.setCompleted(completed);
        }

        return agendaItemRepo.save(agendaItem);
    }

    public Long getCompletedAgendaItemsCount(UUID meetingId, User user) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new IllegalArgumentException("Meeting not found"));

        if(!meeting.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User not authorized to view this meeting's agenda");
        }

        return agendaItemRepo.countCompletedAgendaItemsByMeetingId(meetingId);
    }
}