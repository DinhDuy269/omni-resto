package com.omniresto.backend.controller;

import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.model.user.request.UserRequest; // 👈 Kiểm tra lại đúng package UserRequest
import com.omniresto.backend.model.response.UserResponse; // 👈 Import đúng UserResponse từ model.response
import com.omniresto.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable String id,
            @RequestParam UserStatus status
    ) {
        return ResponseEntity.ok(userService.updateUserStatus(id, status));
    }
}