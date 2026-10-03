package com.omniresto.backend.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatResponse {
    private String reply;
    private List<AiRecommendedDishDto> recommendedDishes;
    private String modelUsed;
    private String error;
}
