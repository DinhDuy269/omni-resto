package com.omniresto.backend.model.reservation.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class OfflineReservationRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String customerPhone;

    private String customerEmail;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người")
    private Integer partySize;

    @NotNull(message = "Thời gian đặt bàn không được để trống")
    private LocalDateTime reservationTime;

    private String tableId; // Nhân viên có thể chọn bàn ngay hoặc xếp sau

    private String specialNotes;

    private boolean seatedImmediately; // True nếu khách đến quán ăn ngay (Walk-in check-in luôn)
}