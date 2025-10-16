package com.meetingminutes.backend.document;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ExtractedData {

    private List<ExtractedDecision> decisions;
    private List<ExtractedActionItem> actionItems;
    private List<ExtractedTopic> topicsDiscussed;
    private List<ExtractedAttendee> attendees;

    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class ExtractedDecision {
        private String topic;
        private String decision;
        private String context;
        private Double confidence;
    }

    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class ExtractedActionItem {
        private String description;
        private String assignedTo;
        private String deadline;
        private Double confidence;
    }

    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class ExtractedTopic {
        private String agendaItem;
        private String summary;
        private Double confidence;
    }

    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class ExtractedAttendee {
        private String name;
        private String email;
        private Double confidence;
    }

}
