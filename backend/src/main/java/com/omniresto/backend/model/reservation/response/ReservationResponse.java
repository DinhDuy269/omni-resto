package com.omniresto.backend.model.reservation.response;

import com.omniresto.backend.domain.enums.ReservationStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
public class ReservationResponse {
    private String id;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private Integer partySize;
    private LocalDate reservationDate;
    private LocalTime reservationTime;
    private String tableNo;
    private String notes;
    private ReservationStatus status;
    private LocalDateTime createdAt;
}
