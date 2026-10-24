package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ConflictException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.request.*;
import com.omniresto.backend.model.response.AuthResponse;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public void sendOtp(SendOtpRequest request) {
        String target = request.getPhone() != null && !request.getPhone().isBlank()
                ? request.getPhone()
                : request.getEmail();
        if (target == null || target.isBlank()) {
            throw new BadRequestException("Số điện thoại hoặc Email không được để trống!");
        }
        if (target.contains("@")) {
            otpService.generateAndSendOtp(target, com.omniresto.backend.domain.enums.OtpPurpose.PASSWORD_RESET);
        } else {
            otpService.generateOtp(target);
        }
    }

    public AuthResponse register(CustomerRegisterRequest request) {
        if (request.getOtp() != null && !request.getOtp().isBlank()) {
            otpService.validateOtp(request.getPhone(), request.getOtp());
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && customerRepository.existsByPhone(request.getPhone())) {
            throw new ConflictException("Số điện thoại này đã được đăng ký tài khoản!");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (customerRepository.existsByEmail(request.getEmail())) {
                throw new ConflictException("Email này đã được đăng ký tài khoản!");
            }
        }
        CustomerEntity customer = CustomerEntity.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .dateOfBirth(request.getDateOfBirth())
                .membershipTier(MembershipTier.standard)
                .loyaltyPoints(0)
                .status(CustomerStatus.active)
                .build();
        CustomerEntity savedCustomer = customerRepository.save(customer);

        String token = jwtService.generateToken(savedCustomer.getId(), Map.of(
                "role", "CUSTOMER",
                "phone", savedCustomer.getPhone(),
                "fullName", savedCustomer.getFullName()
        ));

        return AuthResponse.builder()
                .token(token)
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

    public AuthResponse login(CustomerLoginRequest request) {
        String trimmedUsername = request.getUsername() != null ? request.getUsername().trim() : "";
        CustomerEntity customer = customerRepository.findByPhoneOrEmail(trimmedUsername, trimmedUsername)
                .orElseThrow(() -> new BadRequestException("Số điện thoại/Email hoặc mật khẩu không chính xác!"));
        if (!passwordEncoder.matches(request.getPassword(), customer.getPassword())) {
            throw new BadRequestException("Số điện thoại/Email hoặc mật khẩu không chính xác!");
        }
        if (customer.getStatus() == CustomerStatus.inactive) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa!");
        }
        String token = jwtService.generateToken(customer.getId(), Map.of(
                "role", "CUSTOMER",
                "phone", customer.getPhone() != null ? customer.getPhone() : "",
                "fullName", customer.getFullName() != null ? customer.getFullName() : ""
        ));

        String tierName = customer.getMembershipTier() != null ? customer.getMembershipTier().name() : MembershipTier.standard.name();
        int points = customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0;

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(customer.getId())
                .fullName(customer.getFullName())
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .customerType("MEMBER")
                .memberTier(tierName)
                .points(points)
                .build();
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        String target = request.getPhone() != null && !request.getPhone().isBlank()
                ? request.getPhone()
                : request.getEmail();
        if (target == null || target.isBlank()) {
            throw new BadRequestException("Số điện thoại hoặc Email không được để trống!");
        }
        if (request.getOtp() != null && !request.getOtp().isBlank()) {
            if (target.contains("@")) {
                otpService.verifyOtp(target, request.getOtp(),
                        com.omniresto.backend.domain.enums.OtpPurpose.PASSWORD_RESET);
            } else {
                otpService.validateOtp(target, request.getOtp());
            }
        }
        CustomerEntity customer = customerRepository.findByPhoneOrEmail(target, target)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với thông tin này!"));
        customer.setPassword(passwordEncoder.encode(request.getNewPassword()));
        customerRepository.save(customer);
    }

    public boolean verifyOtp(VerifyOtpRequest request, com.omniresto.backend.domain.enums.OtpPurpose purpose) {
        String target = request.getPhone() != null && !request.getPhone().isBlank()
                ? request.getPhone()
                : request.getEmail();
        if (target == null || target.isBlank()) {
            throw new BadRequestException("Số điện thoại hoặc Email không được để trống!");
        }
        if (target.contains("@")) {
            return otpService.verifyOtp(target, request.getOtp(), purpose);
        } else {
            return otpService.validateOtp(target, request.getOtp());
        }
    }

    public void resendOtp(String target, com.omniresto.backend.domain.enums.OtpPurpose purpose) {
        if (target == null || target.isBlank()) {
            throw new BadRequestException("Thông tin nhận OTP không được để trống!");
        }
        if (target.contains("@")) {
            otpService.generateAndSendOtp(target, purpose);
        } else {
            otpService.generateOtp(target);
        }
    }

    public List<CustomerEntity> getAllCustomersForAdmin() {
        return customerRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<CustomerResponse> getAllCustomerResponses() {
        return getAllCustomersForAdmin().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public CustomerResponse updateStatus(String id, CustomerStatus status) {
        CustomerEntity entity = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng: " + id));
        entity.setStatus(status);
        return mapToResponse(customerRepository.save(entity));
    }

    private CustomerResponse mapToResponse(CustomerEntity entity) {
        CustomerResponse res = new CustomerResponse();
        res.setId(entity.getId());
        res.setFullName(entity.getFullName());
        res.setEmail(entity.getEmail());
        res.setPhone(entity.getPhone());
        res.setDateOfBirth(entity.getDateOfBirth());
        res.setMembershipTier(entity.getMembershipTier() != null ? entity.getMembershipTier() : MembershipTier.standard);
        res.setLoyaltyPoints(entity.getLoyaltyPoints() != null ? entity.getLoyaltyPoints() : 0);
        res.setStatus(entity.getStatus() != null ? entity.getStatus() : CustomerStatus.active);
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}