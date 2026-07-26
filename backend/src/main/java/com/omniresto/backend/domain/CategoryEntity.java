package com.omniresto.backend.domain;

import com.omniresto.backend.domain.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryEntity extends BaseEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    private String description;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;
}
