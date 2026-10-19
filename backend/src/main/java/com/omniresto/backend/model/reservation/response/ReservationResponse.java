package com.omniresto.backend.model.reservation.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    @JsonProperty("reservationCode")
    public String getReservationCodeCamel() { return reservationCode; }

    @JsonProperty("customerName")
    public String getCustomerNameCamel() { return customerName; }

    @JsonProperty("customerPhone")
    public String getCustomerPhoneCamel() { return customerPhone; }

    @JsonProperty("customerEmail")
    public String getCustomerEmailCamel() { return customerEmail; }

    @JsonProperty("partySize")
    public Integer getPartySizeCamel() { return partySize; }

    @JsonProperty("reservationTime")
    public LocalDateTime getReservationTimeCamel() { return reservationTime; }

    @JsonProperty("tableId")
    public String getTableIdCamel() { return tableId; }

    @JsonProperty("tableNo")
    public String getTableNoCamel() { return tableNo; }

    @JsonProperty("tableCapacity")
    public Integer getTableCapacityCamel() { return tableCapacity; }

    @JsonProperty("specialNotes")
    public String getSpecialNotesCamel() { return specialNotes; }

    @JsonProperty("createdAt")
    public LocalDateTime getCreatedAtCamel() { return createdAt; }

    @JsonProperty("updatedAt")
    public LocalDateTime getUpdatedAtCamel() { return updatedAt; }
}