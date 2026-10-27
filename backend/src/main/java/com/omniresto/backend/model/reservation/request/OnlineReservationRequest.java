package com.omniresto.backend.model.reservation.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class OnlineReservationRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    @Size(max = 100, message = "Tên khách hàng không vượt quá 100 ký tự")
    @JsonProperty("customer_name")
    @JsonAlias({"customerName"})
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
            regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$",
            message = "Số điện thoại không đúng định dạng nhà mạng Việt Nam"
    )
    @JsonProperty("customer_phone")
    @JsonAlias({"customerPhone"})
    private String customerPhone;

    @Email(message = "Email không đúng định dạng")
    @JsonProperty("customer_email")
    @JsonAlias({"customerEmail"})
    private String customerEmail;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người")
    @Max(value = 10, message = "Đoàn trên 10 người vui lòng liên hệ hotline trực tiếp để được hỗ trợ ghép bàn")
    @JsonProperty("party_size")
    @JsonAlias({"partySize"})
    private Integer partySize;

    @NotNull(message = "Thời gian đặt bàn không được để trống")
    @Future(message = "Thời gian đặt bàn phải là thời gian trong tương lai")
    @JsonProperty("reservation_time")
    @JsonAlias({"reservationTime"})
    private LocalDateTime reservationTime;

    // Bổ sung nhận ID bàn do khách trực tiếp chọn trên sơ đồ
    @JsonProperty("table_id")
    @JsonAlias({"tableId"})
    private String tableId;

    @JsonProperty("special_notes")
    @JsonAlias({"specialNotes"})
    private String specialNotes;
}