package com.omniresto.backend.model.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpRequest {

    @com.fasterxml.jackson.annotation.JsonAlias({"email", "username", "identifier"})
    private String phone;

    private String email;

    @NotBlank(message = "Mã OTP không được để trống")
    @com.fasterxml.jackson.annotation.JsonAlias({"otpCode", "code"})
    private String otp;
}