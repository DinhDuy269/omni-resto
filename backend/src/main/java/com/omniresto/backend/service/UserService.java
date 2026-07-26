package com.omniresto.backend.service;

import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.model.user.request.UserRequest;
import com.omniresto.backend.model.user.response.UserResponse;
import com.omniresto.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUserById(String id) {
        return userRepository.findById(id)
                .map(this::mapToResponse)
                .orElse(null);
    }

    public UserResponse createUser(UserRequest request) {
        UserEntity entity = UserEntity.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword() != null ? request.getPassword() : "123456"))
                .role(request.getRole() != null ? request.getRole() : RoleType.store_manager)
                .branchId(request.getBranchId() != null ? request.getBranchId() : "br-01")
                .status(request.getStatus() != null ? request.getStatus() : UserStatus.active)
                .avatar(request.getAvatar() != null ? request.getAvatar() : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop")
                .build();
        entity.setId("usr-" + UUID.randomUUID().toString().substring(0, 8));

        UserEntity saved = userRepository.save(entity);
        return mapToResponse(saved);
    }

    public UserResponse updateUserStatus(String id, UserStatus status) {
        UserEntity entity = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        entity.setStatus(status);
        UserEntity updated = userRepository.save(entity);
        return mapToResponse(updated);
    }

    private UserResponse mapToResponse(UserEntity entity) {
        UserResponse res = new UserResponse();
        res.setId(entity.getId());
        res.setFullName(entity.getFullName());
        res.setEmail(entity.getEmail());
        res.setPhone(entity.getPhone());
        res.setRole(entity.getRole());
        res.setBranchId(entity.getBranchId());
        res.setBranchName(entity.getBranchId() != null && entity.getBranchId().equals("ALL") ? "Trụ Sở HQ" : "OmniResto - Hoàn Kiếm");
        res.setStatus(entity.getStatus());
        res.setAvatar(entity.getAvatar());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
