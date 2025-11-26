package com.meetingminutes.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedAttendeeResponse {
    private List<AttendeeDetailResponse> attendees;
    private int page;
    private int size;
    private long total;
    private int totalPages;
    private boolean last;

    public static PaginatedAttendeeResponse from(List<AttendeeDetailResponse> attendees, int page, int size, long total) {
        int totalPages = (int) Math.ceil((double) total / size);
        boolean isLast = (page + 1) >= totalPages;

        return PaginatedAttendeeResponse.builder()
                .attendees(attendees)
                .page(page)
                .size(size)
                .total(total)
                .totalPages(totalPages)
                .last(isLast)
                .build();
    }
}
