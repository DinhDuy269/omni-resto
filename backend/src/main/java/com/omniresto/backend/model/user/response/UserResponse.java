package com.omniresto.backend.model.user.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@JsonRootName("user")
public class UserResponse {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private RoleType role;
    private UserStatus status;
    private String avatar;
    private LocalDateTime createdAt;
}
