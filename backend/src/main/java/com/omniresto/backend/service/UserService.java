package com.omniresto.backend.service;

import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.user.request.UserRequest;
import com.omniresto.backend.model.user.response.UserResponse;
import com.omniresto.backend.repository.UserRepository;
import com.omniresto.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActionLogService actionLogService;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public UserResponse getUserById(String id) {
        return mapToResponse(findUserById(id));
    }

    @Transactional
    public UserResponse createUser(UserRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        String phone = request.getPhone() != null ? request.getPhone().trim() : null;

        if (email != null && (userRepository.existsByEmail(email) || customerRepository.existsByEmail(email))) {
            throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác: " + request.getEmail());
        }

        if (phone != null && !phone.isBlank() && (userRepository.existsByPhone(phone) || customerRepository.existsByPhone(phone))) {
            throw new BadRequestException("Số điện thoại đã được sử dụng bởi tài khoản khác: " + request.getPhone());
        }

        String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword().trim()
                : "123456";

        UserEntity entity = UserEntity.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode(rawPassword))
                .role(request.getRole() != null ? request.getRole() : RoleType.store_manager)
                .status(request.getStatus() != null ? request.getStatus() : UserStatus.active)
                .avatar(request.getAvatar() != null && !request.getAvatar().isBlank()
                        ? request.getAvatar()
                        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop")
                .build();
        entity.setId("usr-" + UUID.randomUUID().toString().substring(0, 8));

        UserEntity saved = userRepository.save(entity);

        actionLogService.record("Nhân Sự & Phân Quyền", "Thêm nhân sự",
                "Tạo tài khoản nhân viên: " + saved.getFullName() + " (Email: " + saved.getEmail() + ", Vai trò: " + saved.getRole() + ")");

        return mapToResponse(saved);
    }

    @Transactional
    public UserResponse updateUser(String id, UserRequest request) {
        UserEntity entity = findUserById(id);

        String newEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null;
        String newPhone = request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null;

        // Nếu thay đổi email, kiểm tra trùng lặp với tài khoản khác
        if (newEmail != null && !newEmail.equalsIgnoreCase(entity.getEmail())) {
            if (userRepository.existsByEmail(newEmail) || customerRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác: " + newEmail);
            }
            entity.setEmail(newEmail);
        }

        // Nếu thay đổi phone, kiểm tra trùng lặp với tài khoản khác
        if (newPhone != null && !newPhone.equals(entity.getPhone())) {
            if (userRepository.existsByPhone(newPhone) || customerRepository.existsByPhone(newPhone)) {
                throw new BadRequestException("Số điện thoại đã được sử dụng bởi tài khoản khác: " + newPhone);
            }
            entity.setPhone(newPhone);
        } else if (request.getPhone() != null && request.getPhone().isBlank()) {
            entity.setPhone(null);
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            entity.setFullName(request.getFullName().trim());
        }

        if (request.getRole() != null) {
            entity.setRole(request.getRole());
        }

        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }

        if (request.getAvatar() != null && !request.getAvatar().isBlank()) {
            entity.setAvatar(request.getAvatar());
        }

        // Đổi mật khẩu nếu người dùng truyền mật khẩu mới
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            entity.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        UserEntity updated = userRepository.save(entity);

        actionLogService.record("Nhân Sự & Phân Quyền", "Cập nhật nhân sự",
                "Cập nhật thông tin nhân sự: " + updated.getFullName() + " (Email: " + updated.getEmail() + ", Vai trò: " + updated.getRole() + ")");

        return mapToResponse(updated);
    }

    @Transactional
    public UserResponse updateUserStatus(String id, UserStatus status) {
        UserEntity entity = findUserById(id);
        entity.setStatus(status);
        UserEntity updated = userRepository.save(entity);

        actionLogService.record("Nhân Sự & Phân Quyền", "Đổi trạng thái nhân sự",
                "Đổi trạng thái tài khoản " + entity.getFullName() + " sang " + status);

        return mapToResponse(updated);
    }

    @Transactional
    public void deleteUser(String id) {
        UserEntity entity = findUserById(id);
        userRepository.delete(entity);

        actionLogService.record("Nhân Sự & Phân Quyền", "Xóa nhân sự",
                "Xóa tài khoản nhân sự: " + entity.getFullName() + " (ID: " + id + ")");
    }

    private UserEntity findUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
    }

    private UserResponse mapToResponse(UserEntity entity) {
        UserResponse res = new UserResponse();
        res.setId(entity.getId());
        res.setFullName(entity.getFullName());
        res.setEmail(entity.getEmail());
        res.setPhone(entity.getPhone());
        res.setRole(entity.getRole());
        res.setStatus(entity.getStatus());
        res.setAvatar(entity.getAvatar());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
