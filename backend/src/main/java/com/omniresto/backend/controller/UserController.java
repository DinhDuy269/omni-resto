package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.dto.UserDto;
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
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    public ResponseEntity<UserDto> createUser(@RequestBody UserDto dto) {
        return ResponseEntity.ok(userService.createUser(dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable String id,
            @RequestParam UserStatus status
    ) {
        return ResponseEntity.ok(userService.updateUserStatus(id, status));
    }
}
