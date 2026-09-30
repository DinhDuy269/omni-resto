package com.omniresto.backend.model.request;

import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserRequest {
    private String fullName;
    private String email;
    private String phone;
    private String password;
    private RoleType role;
    private UserStatus status;
    private String avatar;
}
