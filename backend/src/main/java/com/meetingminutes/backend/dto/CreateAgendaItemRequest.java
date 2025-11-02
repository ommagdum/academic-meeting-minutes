package com.meetingminutes.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
public class CreateAgendaItemRequest {

    @NotBlank(message = "Agenda item title is required")
    @Size(min = 1, max = 255, message = "Title must be between 1 and 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @Min(value = 1, message = "Estimated duration must be at least 1 minute")
    @Max(value = 480, message = "Estimated duration cannot exceed 480 minutes (8 hours)")
    private Integer estimatedDuration;

    @Min(value = 0, message = "Order index cannot be negative")
    private Integer orderIndex;

    public CreateAgendaItemRequest(String title, String description, Integer estimatedDuration) {
        this.title = title;
        this.description = description;
        this.estimatedDuration = estimatedDuration;
    }
}
