package com.omniresto.backend.model.user.response;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class CustomerResponse {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;
    private MembershipTier membershipTier;
    private Integer loyaltyPoints;
    private CustomerStatus status;
    private LocalDateTime createdAt;
}

