package com.omniresto.backend.model.event.response;

import com.omniresto.backend.domain.enums.EventStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
public class EventResponse {
    private String id;
    private String title;
    private String description;
    private String shortDescription;
    private LocalDate eventDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String location;
    private String branchId;
    private String branchName;
    private String imageUrl;
    private BigDecimal price;
    private Integer maxCapacity;
    private Integer registeredCount;
    private EventStatus status;
    private Boolean isFeatured;
    private String tags;
    private LocalDateTime createdAt;
}
