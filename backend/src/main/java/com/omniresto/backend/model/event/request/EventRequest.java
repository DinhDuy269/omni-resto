package com.omniresto.backend.model.event.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class EventRequest {

    @NotBlank(message = "Tiêu đề sự kiện không được để trống")
    @Size(max = 200)
    private String title;

    private String description;

    @Size(max = 500)
    private String shortDescription;

    @NotNull(message = "Ngày sự kiện không được để trống")
    @FutureOrPresent(message = "Ngày sự kiện không được là ngày trong quá khứ")
    private LocalDate eventDate;

    private LocalTime startTime;
    private LocalTime endTime;

    @Size(max = 300)
    private String location;

    private String branchId;

    @Size(max = 500)
    private String imageUrl;

    @DecimalMin(value = "0", message = "Giá không được âm")
    private BigDecimal price;

    @Min(value = 1)
    private Integer maxCapacity;

    private Boolean isFeatured;

    @Size(max = 300)
    private String tags;
}
