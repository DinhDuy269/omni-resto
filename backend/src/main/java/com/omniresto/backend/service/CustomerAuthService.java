package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.request.*;
import com.omniresto.backend.model.response.AuthResponse;
import com.omniresto.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;

    // 1. Gửi OTP xác minh số điện thoại
    public void sendOtp(SendOtpRequest request) {
        otpService.generateOtp(request.getPhone());
    }

    // 2. Đăng ký tài khoản Thành viên
    public AuthResponse register(CustomerRegisterRequest request) {
        // Xác minh OTP
        otpService.validateOtp(request.getPhone(), request.getOtp());

        // Kiểm tra số điện thoại đã tồn tại chưa
        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Số điện thoại này đã được đăng ký tài khoản!");
        }

        // Kiểm tra email nếu người dùng có nhập
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (customerRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email này đã được đăng ký tài khoản!");
            }
        }

        // Tạo mới Entity Customer
        CustomerEntity customer = CustomerEntity.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .membershipTier(MembershipTier.standard)
                .loyaltyPoints(0)
                .status(CustomerStatus.active)
                .build();

        CustomerEntity savedCustomer = customerRepository.save(customer);

        return AuthResponse.builder()
                .token("MOCK_JWT_TOKEN_" + savedCustomer.getId())
                .type("Bearer")
                .id(savedCustomer.getId())
                .fullName(savedCustomer.getFullName())
                .phone(savedCustomer.getPhone())
                .email(savedCustomer.getEmail())
                .customerType("MEMBER")
                .memberTier(savedCustomer.getMembershipTier().name())
                .points(savedCustomer.getLoyaltyPoints())
                .build();
    }

    // 3. Đăng nhập
    public AuthResponse login(CustomerLoginRequest request) {
        CustomerEntity customer = customerRepository.findByPhoneOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new BadRequestException("Số điện thoại/Email hoặc mật khẩu không chính xác!"));

        if (!passwordEncoder.matches(request.getPassword(), customer.getPassword())) {
            throw new BadRequestException("Số điện thoại/Email hoặc mật khẩu không chính xác!");
        }

        if (customer.getStatus() == CustomerStatus.inactive) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa!");
        }

        return AuthResponse.builder()
                .token("MOCK_JWT_TOKEN_" + customer.getId())
                .type("Bearer")
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .customerType("MEMBER")
                .memberTier(customer.getMembershipTier().name())
                .points(customer.getLoyaltyPoints())
                .build();
    }

    // 4. Quên mật khẩu
    public void forgotPassword(ForgotPasswordRequest request) {
        // Xác minh OTP
        otpService.validateOtp(request.getPhone(), request.getOtp());

        CustomerEntity customer = customerRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với số điện thoại này!"));

        customer.setPassword(passwordEncoder.encode(request.getNewPassword()));
        customerRepository.save(customer);
    }

    // 5. Dành cho Admin: Quản lý danh sách thành viên
    public List<CustomerEntity> getAllCustomersForAdmin() {
        return customerRepository.findAllByOrderByCreatedAtDesc();
    }
}