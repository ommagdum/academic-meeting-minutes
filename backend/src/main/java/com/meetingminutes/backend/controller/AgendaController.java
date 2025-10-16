package com.meetingminutes.backend.controller;

import com.meetingminutes.backend.dto.CreateAgendaItemRequest;
import com.meetingminutes.backend.entity.AgendaItem;
import com.meetingminutes.backend.entity.User;
import com.meetingminutes.backend.service.AgendaService;
import com.meetingminutes.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meetings/{meetingId}/agenda")
@RequiredArgsConstructor
public class AgendaController {

    private final AgendaService agendaService;
    private final UserService userService;



    @GetMapping
    public ResponseEntity<List<AgendaItem>> getMeetingAgenda(
            @PathVariable UUID meetingId,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        List<AgendaItem> agenda = agendaService.getMeetingAgenda(meetingId, user);
        return ResponseEntity.ok(agenda);
    }

    @PostMapping
    public ResponseEntity<AgendaItem> createAgendaItem(
            @PathVariable UUID meetingId,
            @RequestBody CreateAgendaItemRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        AgendaItem agendaItem = agendaService.createAgendaItem(request, meetingId, user);
        return ResponseEntity.ok(agendaItem);
    }

    @PutMapping("/{agendaItemId}")
    public ResponseEntity<AgendaItem> updateAgendaItem(
            @PathVariable UUID meetingId,
            @PathVariable UUID agendaItemId,
            @RequestBody CreateAgendaItemRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        AgendaItem agendaItem = agendaService.updateAgendaItem(agendaItemId, request, user);
        return ResponseEntity.ok(agendaItem);
    }

    @DeleteMapping("/{agendaItemId}")
    public ResponseEntity<Void> deleteAgendaItem(
            @PathVariable UUID meetingId,
            @PathVariable UUID agendaItemId,
            Authentication authentication) {
        String email = authentication.getName();
        User user = userService.findByEmail(email);
        agendaService.deleteAgendaItem(agendaItemId, user);
        return ResponseEntity.noContent().build();
    }
}