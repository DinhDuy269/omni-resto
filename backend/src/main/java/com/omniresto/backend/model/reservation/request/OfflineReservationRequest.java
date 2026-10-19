package com.omniresto.backend.model.reservation.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class OfflineReservationRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    @JsonAlias({"customerName", "customer_name"})
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @JsonAlias({"customerPhone", "customer_phone"})
    private String customerPhone;

    @JsonAlias({"customerEmail", "customer_email"})
    private String customerEmail;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người")
    @JsonAlias({"partySize", "party_size"})
    private Integer partySize;

    @NotNull(message = "Thời gian đặt bàn không được để trống")
    @JsonAlias({"reservationTime", "reservation_time"})
    private LocalDateTime reservationTime;

    @JsonAlias({"tableId", "table_id"})
    private String tableId; // Nhân viên có thể chọn bàn ngay hoặc xếp sau

    @JsonAlias({"specialNotes", "special_notes"})
    private String specialNotes;

    @JsonAlias({"seatedImmediately", "seated_immediately"})
    private boolean seatedImmediately; // True nếu khách đến quán ăn ngay (Walk-in check-in luôn)
}