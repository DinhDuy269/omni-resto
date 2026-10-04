package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.CustomerStatus;
import com.omniresto.backend.model.user.response.CustomerResponse;
import com.omniresto.backend.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerAuthController {

    private final CustomerService customerService;

    @GetMapping
    public List<CustomerResponse> getAll() {
        return customerService.getAllCustomers();
    }

    @PatchMapping("/{id}/status")
    public CustomerResponse updateStatus(@PathVariable String id, @RequestParam CustomerStatus status) {
        return customerService.updateStatus(id, status);
    }
}