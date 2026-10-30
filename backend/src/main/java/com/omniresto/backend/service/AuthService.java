package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ConflictException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.request.CustomerRegisterRequest;
import com.omniresto.backend.model.request.LoginRequest;
import com.omniresto.backend.model.response.AuthResponse;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.repository.CustomerRepository;
import com.omniresto.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service xác thực thống nhất cho toàn bộ hệ thống OmniResto.
 *
 * Nguyên tắc:
 *  - 1 luồng đăng nhập duy nhất cho mọi tài khoản (Email/SĐT + Password).
 *  - Tự động nhận diện Role thật từ cơ sở dữ liệu (users và customers).
 *  - 1 luồng đăng ký trực tiếp không qua OTP trung gian.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ActionLogService actionLogService;

    // ─────────────────────────────────────────────────────────────
    // 1. ĐĂNG NHẬP THỐNG NHẤT
    // ─────────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        String input = request.getUsername().trim();

        // Bước 1: Thử tìm trong bảng users (Admin, Manager, Waiter, Cashier, Chef)
        Optional<UserEntity> userOpt = userRepository.findByEmailOrPhone(input.toLowerCase(), input);
        if (userOpt.isPresent()) {
            return loginAsStaff(userOpt.get(), request.getPassword());
        }

        // Bước 2: Thử tìm trong bảng customers (Khách hàng)
        Optional<CustomerEntity> customerOpt = customerRepository.findByPhoneOrEmail(input, input);
        if (customerOpt.isPresent()) {
            return loginAsCustomer(customerOpt.get(), request.getPassword());
        }

        throw new BadRequestException("Thông tin đăng nhập hoặc mật khẩu không chính xác!");
    }

    private AuthResponse loginAsStaff(UserEntity user, String rawPassword) {
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new BadRequestException("Thông tin đăng nhập hoặc mật khẩu không chính xác!");
        }
        if (user.getStatus() == UserStatus.inactive || user.getStatus() == UserStatus.blocked) {
            throw new BadRequestException("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên!");
        }

        String role = user.getRole().name(); // admin, store_manager, cashier, waiter, chef

        String token = jwtService.generateToken(user.getId(), Map.of(
                "role", role,
                "type", "STAFF",
                "fullName", user.getFullName() != null ? user.getFullName() : "",
                "email", user.getEmail() != null ? user.getEmail() : ""
        ));

        log.info("Staff/Admin đăng nhập thành công: id={}, email={}, role={}", user.getId(), user.getEmail(), role);

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatar(user.getAvatar())
                .role(role)
                .build();
    }

    private AuthResponse loginAsCustomer(CustomerEntity customer, String rawPassword) {
        if (!passwordEncoder.matches(rawPassword, customer.getPassword())) {
            throw new BadRequestException("Thông tin đăng nhập hoặc mật khẩu không chính xác!");
        }
        if (customer.getStatus() == CustomerStatus.inactive) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ!");
        }

        String token = jwtService.generateToken(customer.getId(), Map.of(
                "role", "customer",
                "type", "CUSTOMER",
                "fullName", customer.getFullName() != null ? customer.getFullName() : "",
                "email", customer.getEmail() != null ? customer.getEmail() : ""
        ));

        log.info("Customer đăng nhập thành công: id={}, email={}", customer.getId(), customer.getEmail());

        return AuthResponse.builder()
                .token(token)
                .id(customer.getId())
                .fullName(customer.getFullName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .role("customer")
                .memberTier(customer.getMembershipTier() != null ? customer.getMembershipTier().name() : MembershipTier.standard.name())
                .points(customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ĐĂNG KÝ TRỰC TIẾP
    // ─────────────────────────────────────────────────────────────

    public AuthResponse register(CustomerRegisterRequest request) {
        String phone = request.getPhone() != null ? request.getPhone().trim() : "";
        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail().trim().toLowerCase()
                : null;

        if (customerRepository.existsByPhone(phone) || userRepository.existsByPhone(phone)) {
            throw new ConflictException("Số điện thoại này đã được đăng ký tài khoản!");
        }
        if (email != null && (customerRepository.existsByEmail(email) || userRepository.existsByEmail(email))) {
            throw new ConflictException("Email này đã được đăng ký tài khoản!");
        }

        CustomerEntity customer = CustomerEntity.builder()
                .fullName(request.getFullName())
                .phone(phone)
                .email(email != null ? email : phone + "@customer.omniresto.vn")
                .password(passwordEncoder.encode(request.getPassword()))
                .dateOfBirth(request.getDateOfBirth())
                .membershipTier(MembershipTier.standard)
                .loyaltyPoints(0)
                .status(CustomerStatus.active)
                .build();

        CustomerEntity saved = customerRepository.save(customer);

        String token = jwtService.generateToken(saved.getId(), Map.of(
                "role", "customer",
                "type", "CUSTOMER",
                "fullName", saved.getFullName() != null ? saved.getFullName() : "",
                "email", saved.getEmail() != null ? saved.getEmail() : ""
        ));

        log.info("Đăng ký thành viên mới thành công: id={}, phone={}, email={}", saved.getId(), saved.getPhone(), saved.getEmail());

        return AuthResponse.builder()
                .token(token)
                .id(saved.getId())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .role("customer")
                .memberTier(MembershipTier.standard.name())
                .points(0)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // 3. ADMIN: Quản lý khách hàng
    // ─────────────────────────────────────────────────────────────

    public List<CustomerResponse> getAllCustomerResponses() {
        return customerRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToCustomerResponse)
                .toList();
    }

    @Transactional
    public CustomerResponse updateCustomerStatus(String id, CustomerStatus status) {
        CustomerEntity entity = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng: " + id));
        entity.setStatus(status);
        CustomerEntity saved = customerRepository.save(entity);
        actionLogService.record("Hội Viên & Khách Hàng", "Đổi trạng thái hội viên", "Đổi trạng thái khách hàng " + saved.getFullName() + " (" + saved.getPhone() + ") sang " + status);
        return mapToCustomerResponse(saved);
    }

    private CustomerResponse mapToCustomerResponse(CustomerEntity entity) {
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
