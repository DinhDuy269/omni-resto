package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import com.omniresto.backend.exception.BadRequestException;
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

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;

    public void sendOtp(SendOtpRequest request) {
        otpService.generateOtp(request.getPhone());
    }

    public AuthResponse register(CustomerRegisterRequest request) {
        otpService.validateOtp(request.getPhone(), request.getOtp());
        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new BadRequestException("Số điện thoại này đã được đăng ký tài khoản!");
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            if (customerRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email này đã được đăng ký tài khoản!");
            }
        }
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

    public void forgotPassword(ForgotPasswordRequest request) {
        otpService.validateOtp(request.getPhone(), request.getOtp());
        CustomerEntity customer = customerRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với số điện thoại này!"));
        customer.setPassword(passwordEncoder.encode(request.getNewPassword()));
        customerRepository.save(customer);
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
        res.setMembershipTier(entity.getMembershipTier());
        res.setLoyaltyPoints(entity.getLoyaltyPoints());
        res.setStatus(entity.getStatus());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}