package com.meetingminutes.backend.service;

import com.meetingminutes.backend.dto.CreateAgendaItemRequest;
import com.meetingminutes.backend.dto.CreateMeetingRequest;
import com.meetingminutes.backend.dto.UpdateMeetingRequest;
import com.meetingminutes.backend.entity.*;
import com.meetingminutes.backend.exception.ForbiddenException;
import com.meetingminutes.backend.exception.ValidationException;
import com.meetingminutes.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MeetingServiceTest {

    @Mock
    private MeetingRepository meetingRepository;
    @Mock
    private MeetingSeriesRepo meetingSeriesRepo;
    @Mock
    private UserRepo userRepo;
    @Mock
    private AgendaItemRepo agendaItemRepo;
    @Mock
    private AttendeeRepo attendeeRepo;
    @Mock
    private AgendaService agendaService;
    @Mock
    private MeetingAccessService meetingAccessService;

    @InjectMocks
    private MeetingService meetingService;

    private User testUser;
    private CreateMeetingRequest createRequest;
    private Meeting testMeeting;
    private MeetingSeries testSeries;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@example.com");

        createRequest = new CreateMeetingRequest();
        createRequest.setTitle("Test Meeting");
        createRequest.setDescription("Test Desc");
        createRequest.setScheduledTime(LocalDateTime.now().plusDays(1));

        testMeeting = new Meeting();
        testMeeting.setId(UUID.randomUUID());
        testMeeting.setTitle("Existing Meeting");
        testMeeting.setCreatedBy(testUser);
        testMeeting.setStatus(MeetingStatus.DRAFT);

        testSeries = new MeetingSeries();
        testSeries.setId(UUID.randomUUID());
        testSeries.setTitle("Test Series");
        testSeries.setCreatedBy(testUser);
    }

    // --- createMeeting Tests ---

    @Test
    void createMeeting_HappyPath_NoSeries_ReturnsSavedMeeting() {
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> {
            Meeting m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        Meeting result = meetingService.createMeeting(createRequest, testUser);

        assertNotNull(result);
        assertEquals("Test Meeting", result.getTitle());
        assertEquals(MeetingStatus.DRAFT, result.getStatus());
        assertNull(result.getSeries());

        ArgumentCaptor<Attendee> attendeeCaptor = ArgumentCaptor.forClass(Attendee.class);
        verify(attendeeRepo).save(attendeeCaptor.capture());
        Attendee savedAttendee = attendeeCaptor.getValue();
        assertEquals(testUser, savedAttendee.getUser());
        assertTrue(savedAttendee.getIsOrganizer());
        assertEquals(AttendanceStatus.CONFIRMED, savedAttendee.getStatus());

        verify(agendaService, never()).createAgendaItems(any(), any());
    }

    @Test
    void createMeeting_WithExistingSeriesId_SeriesIsSet() {
        createRequest.setSeriesId(testSeries.getId());
        when(meetingSeriesRepo.findById(testSeries.getId())).thenReturn(Optional.of(testSeries));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.createMeeting(createRequest, testUser);

        assertNotNull(result.getSeries());
        assertEquals(testSeries.getId(), result.getSeries().getId());
    }

    @Test
    void createMeeting_WithNewSeriesTitle_NewSeriesCreated() {
        createRequest.setNewSeriesTitle("Brand New Series");
        when(meetingSeriesRepo.save(any(MeetingSeries.class))).thenAnswer(i -> i.getArgument(0));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.createMeeting(createRequest, testUser);

        assertNotNull(result.getSeries());
        assertEquals("Brand New Series", result.getSeries().getTitle());
        verify(meetingSeriesRepo).save(any(MeetingSeries.class));
    }

    @Test
    void createMeeting_BothSeriesIdAndNewSeriesTitle_ThrowsException() {
        createRequest.setSeriesId(UUID.randomUUID());
        createRequest.setNewSeriesTitle("Brand New Series");

        assertThrows(IllegalArgumentException.class, () -> meetingService.createMeeting(createRequest, testUser));
    }

    @Test
    void createMeeting_WithAgendaItems_CallsAgendaService() {
        List<CreateAgendaItemRequest> agendaItems = new ArrayList<>();
        agendaItems.add(new CreateAgendaItemRequest());
        createRequest.setAgendaItems(agendaItems);

        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        meetingService.createMeeting(createRequest, testUser);

        verify(agendaService, times(1)).createAgendaItems(any(Meeting.class), eq(agendaItems));
    }

    @Test
    void createMeeting_NullAgendaItems_NeverCallsAgendaService() {
        createRequest.setAgendaItems(null);
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        meetingService.createMeeting(createRequest, testUser);

        verify(agendaService, never()).createAgendaItems(any(), any());
    }

    @Test
    void createMeeting_SeriesIdNotFound_ThrowsException() {
        createRequest.setSeriesId(UUID.randomUUID());
        when(meetingSeriesRepo.findById(any(UUID.class))).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> meetingService.createMeeting(createRequest, testUser));
    }

    // --- updateMeetingStatus Tests ---

    @Test
    void updateMeetingStatus_Processing_SetsActualStartTime() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.updateMeetingStatus(testMeeting.getId(), MeetingStatus.PROCESSING, testUser);

        assertEquals(MeetingStatus.PROCESSING, result.getStatus());
        assertNotNull(result.getActualStartTime());
        assertNull(result.getActualEndTime());
    }

    @Test
    void updateMeetingStatus_Processed_SetsActualEndTime() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.updateMeetingStatus(testMeeting.getId(), MeetingStatus.PROCESSED, testUser);

        assertEquals(MeetingStatus.PROCESSED, result.getStatus());
        assertNotNull(result.getActualEndTime());
    }

    @Test
    void updateMeetingStatus_Failed_SetsActualEndTime() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.updateMeetingStatus(testMeeting.getId(), MeetingStatus.FAILED, testUser);

        assertEquals(MeetingStatus.FAILED, result.getStatus());
        assertNotNull(result.getActualEndTime());
    }

    @Test
    void updateMeetingStatus_Draft_DoesNotTouchTimeFields() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        Meeting result = meetingService.updateMeetingStatus(testMeeting.getId(), MeetingStatus.DRAFT, testUser);

        assertEquals(MeetingStatus.DRAFT, result.getStatus());
        assertNull(result.getActualStartTime());
        assertNull(result.getActualEndTime());
    }

    @Test
    void updateMeetingStatus_MeetingNotFound_ThrowsException() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> meetingService.updateMeetingStatus(testMeeting.getId(), MeetingStatus.PROCESSING, testUser));
    }

    // --- updateMeeting Tests ---

    @Test
    void updateMeeting_ProcessingStatus_ThrowsValidationException() {
        testMeeting.setStatus(MeetingStatus.PROCESSING);
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        assertThrows(ValidationException.class, () -> meetingService.updateMeeting(testMeeting.getId(), request, testUser));
    }

    @Test
    void updateMeeting_Draft_UpdatesProvidedFields() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        request.setTitle("New Title");
        request.setDescription("New Desc");

        Meeting result = meetingService.updateMeeting(testMeeting.getId(), request, testUser);

        assertEquals("New Title", result.getTitle());
        assertEquals("New Desc", result.getDescription());
    }

    @Test
    void updateMeeting_SeriesIdProvidedNotOwner_ThrowsForbiddenException() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        
        User otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        testSeries.setCreatedBy(otherUser);

        when(meetingSeriesRepo.findById(testSeries.getId())).thenReturn(Optional.of(testSeries));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        request.setSeriesId(testSeries.getId());

        assertThrows(ForbiddenException.class, () -> meetingService.updateMeeting(testMeeting.getId(), request, testUser));
    }

    @Test
    void updateMeeting_NewSeriesTitleProvided_NewSeriesCreated() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingSeriesRepo.save(any(MeetingSeries.class))).thenAnswer(i -> i.getArgument(0));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        request.setNewSeriesTitle("Another New Series");

        Meeting result = meetingService.updateMeeting(testMeeting.getId(), request, testUser);

        assertNotNull(result.getSeries());
        assertEquals("Another New Series", result.getSeries().getTitle());
    }

    @Test
    void updateMeeting_AgendaItemsProvided_OldDeletedNewSaved() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        List<CreateAgendaItemRequest> agendaItems = new ArrayList<>();
        CreateAgendaItemRequest item = new CreateAgendaItemRequest();
        item.setTitle("New Agenda Item");
        agendaItems.add(item);
        request.setAgendaItems(agendaItems);

        meetingService.updateMeeting(testMeeting.getId(), request, testUser);

        verify(agendaItemRepo).deleteByMeetingId(testMeeting.getId());
        verify(agendaItemRepo).saveAll(anyList());
    }

    @Test
    void updateMeeting_PartialFieldsProvided_NullFieldsNotOverwritten() {
        testMeeting.setTitle("Original Title");
        testMeeting.setDescription("Original Desc");
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(i -> i.getArgument(0));

        UpdateMeetingRequest request = new UpdateMeetingRequest();
        request.setTitle("New Title");
        // description is null

        Meeting result = meetingService.updateMeeting(testMeeting.getId(), request, testUser);

        assertEquals("New Title", result.getTitle());
        assertEquals("Original Desc", result.getDescription());
    }

    // --- getMeeting Tests ---

    @Test
    void getMeeting_FoundAndCreator_ReturnsMeeting() {
        when(meetingRepository.findById(testMeeting.getId())).thenReturn(Optional.of(testMeeting));
        when(meetingAccessService.hasAccessToMeeting(testMeeting, testUser)).thenReturn(true);

        Meeting result = meetingService.getMeeting(testMeeting.getId(), testUser);

        assertNotNull(result);
        assertEquals(testMeeting.getId(), result.getId());
    }

    @Test
    void getMeeting_FoundAndAttendee_ReturnsMeeting() {
        when(meetingRepository.findById(testMeeting.getId())).thenReturn(Optional.of(testMeeting));
        when(meetingAccessService.hasAccessToMeeting(testMeeting, testUser)).thenReturn(true);

        Meeting result = meetingService.getMeeting(testMeeting.getId(), testUser);

        assertNotNull(result);
    }

    @Test
    void getMeeting_FoundNoAccess_ThrowsException() {
        when(meetingRepository.findById(testMeeting.getId())).thenReturn(Optional.of(testMeeting));
        when(meetingAccessService.hasAccessToMeeting(testMeeting, testUser)).thenReturn(false);

        assertThrows(RuntimeException.class, () -> meetingService.getMeeting(testMeeting.getId(), testUser));
    }

    @Test
    void getMeeting_NotFound_ThrowsException() {
        when(meetingRepository.findById(testMeeting.getId())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> meetingService.getMeeting(testMeeting.getId(), testUser));
    }

    // --- deleteMeeting Tests ---

    @Test
    void deleteMeeting_FoundAndOwned_DeletesMeeting() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.of(testMeeting));

        meetingService.deleteMeeting(testMeeting.getId(), testUser);

        verify(meetingRepository).delete(testMeeting);
    }

    @Test
    void deleteMeeting_NotFoundOrNotOwned_ThrowsException() {
        when(meetingRepository.findByIdAndCreatedBy(testMeeting.getId(), testUser)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> meetingService.deleteMeeting(testMeeting.getId(), testUser));
    }
}
