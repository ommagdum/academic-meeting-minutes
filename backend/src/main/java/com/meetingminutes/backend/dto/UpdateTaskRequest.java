package com.meetingminutes.backend.dto;

import com.meetingminutes.backend.entity.TaskStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class UpdateTaskRequest {
    private TaskStatus status;
    private String description;
    private LocalDateTime deadline;
    private Integer priority;
    private String notes;
    private String completionNotes;
}
