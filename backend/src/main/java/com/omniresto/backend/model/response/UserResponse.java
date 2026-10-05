package com.omniresto.backend.model.response;

import com.fasterxml.jackson.annotation.JsonRootName;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonRootName("user")
public class UserResponse {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private RoleType role;
    private String branchId;
    private String branchName;
    private UserStatus status;
    private String avatar;
    private LocalDateTime createdAt;
}