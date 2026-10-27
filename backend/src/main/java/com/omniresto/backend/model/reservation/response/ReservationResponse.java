package com.omniresto.backend.model.reservation.response;

import com.omniresto.backend.domain.enums.OperatingShift;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ReservationResponse {
    private String id;
    private String reservationCode;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private Integer partySize;
    private LocalDateTime reservationTime;
    private String status;
    private String tableId;
    private String tableNo;
    private Integer tableCapacity;
    private String specialNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Bổ sung thông tin ca phục vụ
    private OperatingShift shift;
    private String shiftName;
}