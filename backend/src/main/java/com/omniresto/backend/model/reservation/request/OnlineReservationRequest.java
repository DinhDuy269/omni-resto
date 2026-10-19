package com.omniresto.backend.model.reservation.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class OnlineReservationRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    @JsonAlias({"customerName", "customer_name"})
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @JsonAlias({"customerPhone", "customer_phone"})
    private String customerPhone;

    @Email(message = "Email không đúng định dạng")
    @JsonAlias({"customerEmail", "customer_email"})
    private String customerEmail;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người")
    @JsonAlias({"partySize", "party_size"})
    private Integer partySize;

    @NotNull(message = "Thời gian đặt bàn không được để trống")
    @Future(message = "Thời gian đặt bàn phải ở tương lai")
    @JsonAlias({"reservationTime", "reservation_time"})
    private LocalDateTime reservationTime;

    @JsonAlias({"specialNotes", "special_notes"})
    private String specialNotes;
}