package com.meetingminutes.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponse {
    private List<MeetingSearchResult> results;
    private Map<String, Object> facets;
    private long totalResults;
    private int totalPages;
    private int currentPage;

    private Map<String, Long> statusFacet;
    private Map<String, Long> seriesFacet;
    private Map<String, Long> dateFacet;
    private Map<String, Long> categoryFacet;

    private Map<String, Long> dateGroupCounts;
}
