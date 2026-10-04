package com.omniresto.backend.service;

import com.omniresto.backend.domain.CustomerEntity;
import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.domain.enums.MembershipTier;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.user.request.CustomerRegisterRequest;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public CustomerResponse register(CustomerRegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();

        if (customerRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }
        if (customerRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }

        CustomerEntity entity = CustomerEntity.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(phone)
                .password(passwordEncoder.encode(request.getPassword()))
                .dateOfBirth(request.getDateOfBirth())
                .membershipTier(MembershipTier.standard)
                .loyaltyPoints(0)
                .status(CustomerStatus.active)
                .build();

        return mapToResponse(customerRepository.save(entity));
    }

    // [THÊM] Lấy danh sách khách hàng cho trang quản lý admin
    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // [THÊM] Khóa / mở khóa tài khoản khách hàng
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