package com.omniresto.backend.model.menu.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class MealPeriodInfoResponse {
    private String currentPeriod;
    private String periodName;
    private String timeRange;
    private String currentTime;
    private Boolean isOrderingAvailable;
    private String message;
}
