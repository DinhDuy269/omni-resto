package com.omniresto.backend.dto;

import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private RoleType role;
    private String branchId;
    private String branchName;
    private UserStatus status;
    private String avatar;
}
