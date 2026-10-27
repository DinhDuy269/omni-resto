package com.omniresto.backend.model.reservation.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class OfflineReservationRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    @JsonProperty("customer_name")
    @JsonAlias({"customerName"})
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @JsonProperty("customer_phone")
    @JsonAlias({"customerPhone"})
    private String customerPhone;

    @JsonProperty("customer_email")
    @JsonAlias({"customerEmail"})
    private String customerEmail;

    @NotNull(message = "Số lượng khách không được để trống")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1 người")
    @JsonProperty("party_size")
    @JsonAlias({"partySize"})
    private Integer partySize;

    @NotNull(message = "Thời gian đặt bàn không được để trống")
    @JsonProperty("reservation_time")
    @JsonAlias({"reservationTime"})
    private LocalDateTime reservationTime;

    @JsonProperty("table_id")
    @JsonAlias({"tableId"})
    private String tableId;

    @JsonProperty("table_ids")
    @JsonAlias({"tableIds"})
    private List<String> tableIds;

    @JsonProperty("special_notes")
    @JsonAlias({"specialNotes"})
    private String specialNotes;

    @JsonProperty("seated_immediately")
    @JsonAlias({"seatedImmediately"})
    private boolean seatedImmediately;
}