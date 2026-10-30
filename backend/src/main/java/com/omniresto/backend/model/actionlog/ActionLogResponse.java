package com.omniresto.backend.model.actionlog;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionLogResponse {

    private String id;
    private String userName;
    private String userRole;
    private String screen;
    private String feature;
    private String action;
    private LocalDateTime createdAt;
}
