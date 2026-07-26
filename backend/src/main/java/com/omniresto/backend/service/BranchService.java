package com.omniresto.backend.service;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.enums.BranchStatus;
import com.omniresto.backend.dto.BranchDto;
import com.omniresto.backend.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    public List<BranchDto> getAllBranches() {
        return branchRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public BranchDto getBranchById(String id) {
        BranchEntity entity = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + id));
        return mapToDto(entity);
    }

    public BranchDto createBranch(BranchDto dto) {
        BranchEntity entity = BranchEntity.builder()
                .code(dto.getCode())
                .name(dto.getName())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .managerName(dto.getManagerName())
                .status(dto.getStatus() != null ? dto.getStatus() : BranchStatus.active)
                .tablesCount(dto.getTablesCount() != null ? dto.getTablesCount() : 20)
                .dailyRevenue(dto.getDailyRevenue())
                .rating(dto.getRating() != null ? dto.getRating() : 5.0)
                .build();

        BranchEntity saved = branchRepository.save(entity);
        return mapToDto(saved);
    }

    public BranchDto updateBranchStatus(String id, BranchStatus status) {
        BranchEntity entity = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found with id: " + id));
        entity.setStatus(status);
        return mapToDto(branchRepository.save(entity));
    }

    private BranchDto mapToDto(BranchEntity entity) {
        return BranchDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .address(entity.getAddress())
                .phone(entity.getPhone())
                .managerName(entity.getManagerName())
                .status(entity.getStatus())
                .tablesCount(entity.getTablesCount())
                .dailyRevenue(entity.getDailyRevenue())
                .rating(entity.getRating())
                .build();
    }
}
