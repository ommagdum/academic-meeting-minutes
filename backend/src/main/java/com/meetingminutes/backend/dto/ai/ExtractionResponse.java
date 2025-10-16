package com.meetingminutes.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.meetingminutes.backend.document.ExtractedData;
import lombok.Data;

@Data
public class ExtractionResponse {

    @JsonProperty("success")
    private Boolean success;

    @JsonProperty("extracted_data")
    private ExtractedData extractedData;

    @JsonProperty("processing_time")
    private Double processingTime;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("confidence_score")
    private Double confidenceScore;

    public boolean isSuccess() {
        return Boolean.TRUE.equals(success);
    }
}
