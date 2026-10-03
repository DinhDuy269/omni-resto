package com.omniresto.backend.model.menu.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {
    private String id;
    private String code;
    private String name;
    private String description;
    private Integer displayOrder;
    private List<CategoryOptionResponse> options;
}
