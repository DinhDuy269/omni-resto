package com.omniresto.backend.service;

import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.OtpPurpose;
import com.omniresto.backend.domain.enums.RoleType;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.model.AuthDto;
import com.omniresto.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    // 1. Đăng ký tài khoản mới (Tạo user ở trạng thái PENDING_VERIFICATION và gửi OTP)
    @Transactional
    public void register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã được sử dụng trong hệ thống!");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Số điện thoại đã được sử dụng trong hệ thống!");
        }

        UserEntity user = UserEntity.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(RoleType.CUSTOMER)
                .status(UserStatus.PENDING_VERIFICATION)
                .build();

        userRepository.save(user);

        // Sinh và gửi OTP xác minh đăng ký
        otpService.generateAndSendOtp(request.getEmail(), OtpPurpose.REGISTER_VERIFICATION);
    }

    // 2. Xác minh OTP Đăng ký
    @Transactional
    public void verifyRegisterOtp(AuthDto.VerifyRegisterOtpRequest request) {
        boolean isValid = otpService.verifyOtp(
                request.getEmail(),
                request.getOtpCode(),
                OtpPurpose.REGISTER_VERIFICATION
        );

        if (!isValid) {
            throw new RuntimeException("Mã OTP không chính xác hoặc đã hết hạn!");
        }

        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản!"));

        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    // 3. Đăng nhập
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        UserEntity user = userRepository.findByEmailOrPhone(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new RuntimeException("Tài khoản hoặc mật khẩu không chính xác!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác!");
        }

        if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
            throw new RuntimeException("Tài khoản chưa được xác minh OTP. Vui lòng hoàn tất xác minh!");
        }

        if (user.getStatus() == UserStatus.BLOCKED || user.getStatus() == UserStatus.INACTIVE) {
            throw new RuntimeException("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động!");
        }

        String mockJwtToken = "Bearer_Token_" + user.getId();

        return AuthDto.AuthResponse.builder()
                .token(mockJwtToken)
                .userId(UUID.fromString(user.getId()))// Truyền trực tiếp kiểu UUID
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .build();
    }

    // 4. Yêu cầu mã OTP Quên mật khẩu
    @Transactional
    public void requestPasswordReset(AuthDto.SendOtpRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email này!"));

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new RuntimeException("Tài khoản hiện đang bị khóa!");
        }

        otpService.generateAndSendOtp(request.getEmail(), OtpPurpose.PASSWORD_RESET);
    }

    // 5. Xác minh OTP Quên mật khẩu
    public void verifyResetOtp(AuthDto.VerifyResetOtpRequest request) {
        boolean isValid = otpService.verifyOtp(
                request.getEmail(),
                request.getOtpCode(),
                OtpPurpose.PASSWORD_RESET
        );

        if (!isValid) {
            throw new RuntimeException("Mã OTP không chính xác hoặc đã hết hạn!");
        }
    }

    // 6. Đặt lại mật khẩu mới
    @Transactional
    public void resetPassword(AuthDto.ResetPasswordRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản!"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    // 7. Gửi lại mã OTP (cho Đăng ký hoặc Quên mật khẩu)
    @Transactional
    public void resendOtp(String email, OtpPurpose purpose) {
        if (!userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email chưa được đăng ký trong hệ thống!");
        }
        otpService.generateAndSendOtp(email, purpose);
    }

    // --- CÁC CHỨC NĂNG DÀNH CHO ADMIN QUẢN LÝ THÀNH VIÊN ---

    // 8. Admin Lấy danh sách tất cả người dùng
    public List<AuthDto.UserAdminDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> AuthDto.UserAdminDto.builder()
                        .id(UUID.fromString(user.getId())) // Truyền trực tiếp kiểu UUID
                        .fullName(user.getFullName())
                        .email(user.getEmail())
                        .phone(user.getPhone())
                        .role(user.getRole())
                        .status(user.getStatus())
                        .createdAt(user.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    // 9. Admin Cập nhật trạng thái tài khoản
    @Transactional
    public void updateUserStatus(UUID userId, UserStatus status) {
        // Chuyển UUID userId sang String bằng String.valueOf() hoặc userId.toString()
        UserEntity user = userRepository.findById(String.valueOf(userId))
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng!"));

        user.setStatus(status);
        userRepository.save(user);
    }
}