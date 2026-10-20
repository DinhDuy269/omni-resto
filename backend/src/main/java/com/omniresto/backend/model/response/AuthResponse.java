package com.omniresto.backend.model.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String token;
    @Builder.Default
    private String type = "Bearer";
    private String id;
    private String fullName;
    private String phone;
    private String email;
    private String customerType;
    private String memberTier;
    private Integer points;
}