package com.omniresto.backend.model.user.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserRequest {
    @NotBlank(message = "Họ và tên nhân viên không được để trống!")
    @JsonProperty("full_name")
    @JsonAlias({"fullName", "full_name"})
    private String fullName;

    @NotBlank(message = "Email đăng nhập không được để trống!")
    @Email(message = "Email không đúng định dạng!")
    private String email;

    private String phone;
    private String password;
    private RoleType role;
    private UserStatus status;
    private String avatar;
}
