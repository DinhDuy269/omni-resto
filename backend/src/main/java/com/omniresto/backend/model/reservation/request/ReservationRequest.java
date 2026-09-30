package com.omniresto.backend.model.reservation.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
public class ReservationRequest {


    @NotBlank(message = "Họ tên khách hàng không được để trống")
    @Size(max = 100, message = "Họ tên không được vượt quá 100 ký tự")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^[0-9]{9,11}$", message = "Số điện thoại không hợp lệ (9-11 chữ số)")
    private String customerPhone;

    @Email(message = "Email không hợp lệ")
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự")
    private String customerEmail;

    @Min(value = 1, message = "Số người phải ít nhất 1")
    @Max(value = 50, message = "Số người không được vượt quá 50")
    private Integer partySize;

    @NotNull(message = "Ngày đặt bàn không được để trống")
    @FutureOrPresent(message = "Ngày đặt bàn không được là ngày trong quá khứ")
    private LocalDate reservationDate;

    @NotNull(message = "Giờ đặt bàn không được để trống")
    private LocalTime reservationTime;

    private String tableNo;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String notes;
}
