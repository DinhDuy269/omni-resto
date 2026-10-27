package com.omniresto.backend.model.order.response;

import com.omniresto.backend.domain.enums.OptionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemOptionResponse {

    private String id;

    private String optionId;

    private String optionName;

    private OptionType optionType;

    private BigDecimal price;
}
