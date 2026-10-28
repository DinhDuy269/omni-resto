package com.omniresto.backend.model.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerLoginRequest {

    @NotBlank(message = "Số điện thoại hoặc Email không được để trống")
    @com.fasterxml.jackson.annotation.JsonAlias({ "identifier", "username", "usernameOrEmail" })
    private String username; // Có thể nhập Phone hoặc Email

    @NotBlank(message = "Mật khẩu không được để trống")
    private String password;
}