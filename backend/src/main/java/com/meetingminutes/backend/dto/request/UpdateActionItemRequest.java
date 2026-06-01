package com.meetingminutes.backend.dto.request;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class UpdateActionItemRequest {

    private String description;

    private LocalDateTime deadline;
    
    private Integer priority;
    
    private String notes;
    
    private String assignedToEmail;
}
