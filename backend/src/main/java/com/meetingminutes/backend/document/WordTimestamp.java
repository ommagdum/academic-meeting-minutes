package com.meetingminutes.backend.document;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Data
public class WordTimestamp {
    private String word;
    private Double startTime;
    private Double endTime;

    @JsonProperty("confidence")
    private Double confidence;
}
