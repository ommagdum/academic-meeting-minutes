package com.meetingminutes.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class CreateActionItemRequest {

    @NotBlank(message = "Description cannot be blank")
    private String description;

    private String assignedToEmail;
    
    private LocalDateTime deadline;
    
    private Integer priority = 1;
    
    private String notes;
}
