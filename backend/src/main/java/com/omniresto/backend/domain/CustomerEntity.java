package com.omniresto.backend.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.omniresto.backend.converter.CustomerStatusConverter;
import com.omniresto.backend.converter.MembershipTierConverter;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "customers",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "email"),
                @UniqueConstraint(columnNames = "phone")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerEntity {

    @Id
    @Column(length = 20)
    private String id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 20)
    private String phone;

    @JsonIgnore
    @Column(nullable = false)
    private String password; // đã mã hoá BCrypt

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Convert(converter = MembershipTierConverter.class)
    @Column(name = "membership_tier", nullable = false, length = 20)
    private MembershipTier membershipTier;

    @Column(name = "loyalty_points", nullable = false)
    private Integer loyaltyPoints;

    @Convert(converter = CustomerStatusConverter.class)
    @Column(nullable = false, length = 20)
    private CustomerStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.id == null) {
            this.id = "cus-" + UUID.randomUUID().toString().substring(0, 8);
        }
        this.createdAt = LocalDateTime.now();
    }
}

