package com.omniresto.backend.model.actionlog;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionLogRequest {

    private String userName;

    private String userRole;

    @NotBlank(message = "Màn thao tác không được để trống!")
    private String screen;

    @NotBlank(message = "Chức năng thao tác không được để trống!")
    private String feature;

    @NotBlank(message = "Action không được để trống!")
    private String action;
}
