package com.omniresto.backend.model.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRegisterRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName; // Map với JSON "full_name" qua Jackson SNAKE_CASE

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(0|\\+84)[3|5|7|8|9]\\d{8}$", message = "Số điện thoại không đúng định dạng Việt Nam")
    private String phone;

    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;

    @Past(message = "Ngày sinh phải ở trong quá khứ")
    private LocalDate dateOfBirth; // Tùy chọn

    private String otp; // Tùy chọn, không bắt buộc
}
