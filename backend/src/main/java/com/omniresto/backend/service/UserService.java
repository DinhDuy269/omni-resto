package com.omniresto.backend.service;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.domain.enums.UserStatus;
import com.omniresto.backend.dto.UserDto;
import com.omniresto.backend.repository.BranchRepository;
import com.omniresto.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public UserDto getUserById(String id) {
        UserEntity entity = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return mapToDto(entity);
    }

    public UserDto createUser(UserDto dto) {
        UserEntity entity = UserEntity.builder()
                .fullName(dto.getFullName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .password("password123") // Default password
                .role(dto.getRole())
                .branchId(dto.getBranchId())
                .status(UserStatus.active)
                .avatar(dto.getAvatar())
                .build();

        return mapToDto(userRepository.save(entity));
    }

    public UserDto updateUserStatus(String id, UserStatus status) {
        UserEntity entity = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        entity.setStatus(status);
        return mapToDto(userRepository.save(entity));
    }

    private UserDto mapToDto(UserEntity entity) {
        String branchName = "Trụ Sở HQ";
        if (entity.getBranchId() != null && !"ALL".equalsIgnoreCase(entity.getBranchId())) {
            branchName = branchRepository.findById(entity.getBranchId())
                    .map(BranchEntity::getName)
                    .orElse("Chi nhánh " + entity.getBranchId());
        }

        return UserDto.builder()
                .id(entity.getId())
                .fullName(entity.getFullName())
                .email(entity.getEmail())
                .phone(entity.getPhone())
                .role(entity.getRole())
                .branchId(entity.getBranchId())
                .branchName(branchName)
                .status(entity.getStatus())
                .avatar(entity.getAvatar())
                .build();
    }
}
