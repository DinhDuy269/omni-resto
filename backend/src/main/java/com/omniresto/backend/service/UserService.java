package com.omniresto.backend.service;

import com.omniresto.backend.model.response.UserResponse;
import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.model.user.request.UserRequest;
import com.omniresto.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // Helper map từ Entity sang UserResponse DTO
    private UserResponse mapToUserResponse(UserEntity user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .branchId(user.getBranchId())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    // 1. Lấy tất cả người dùng cho UserController
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    // 2. Lấy thông tin user theo ID dạng DTO
    public UserResponse getUserById(String id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));
        return mapToUserResponse(user);
    }

    // 3. Tạo người dùng mới
    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }

        UserEntity user = UserEntity.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(request.getRole() != null ? request.getRole() : RoleType.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .build();

        UserEntity savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    // 4. Cập nhật trạng thái người dùng
    @Transactional
    public UserResponse updateUserStatus(String id, UserStatus status) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));

        user.setStatus(status);
        UserEntity updatedUser = userRepository.save(user);
        return mapToUserResponse(updatedUser);
    }

    // Các hàm bổ trợ nâng cao
    public List<UserEntity> getUsersByBranch(String branchId) {
        return userRepository.findByBranchId(branchId);
    }

    public List<UserEntity> getStoreManagers() {
        return userRepository.findByRole(RoleType.STORE_MANAGER);
    }

    public List<UserEntity> getUsersByRole(RoleType role) {
        return userRepository.findByRole(role);
    }

    @Transactional
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy người dùng để xóa!");
        }
        userRepository.deleteById(id);
    }
}