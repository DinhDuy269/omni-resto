package com.omniresto.backend.service;

import com.omniresto.backend.domain.BranchEntity;
import com.omniresto.backend.domain.enums.BranchStatus;
import com.omniresto.backend.model.branch.request.BranchRequest;
import com.omniresto.backend.model.branch.response.BranchResponse;
import com.omniresto.backend.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    public List<BranchResponse> getAllBranches() {
        return branchRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BranchResponse getBranchById(String id) {
        return branchRepository.findById(id)
                .map(this::mapToResponse)
                .orElse(null);
    }

    public BranchResponse createBranch(BranchRequest request) {
        BranchEntity entity = BranchEntity.builder()
                .code(request.getCode())
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .managerName(request.getManagerName())
                .status(request.getStatus() != null ? request.getStatus() : BranchStatus.active)
                .tablesCount(request.getTablesCount() != null ? request.getTablesCount() : 0)
                .dailyRevenue(request.getDailyRevenue())
                .rating(request.getRating() != null ? request.getRating() : 5.0)
                .build();
        entity.setId("br-" + UUID.randomUUID().toString().substring(0, 8));

        BranchEntity saved = branchRepository.save(entity);
        return mapToResponse(saved);
    }

    public BranchResponse updateBranchStatus(String id, BranchStatus status) {
        BranchEntity entity = branchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
        entity.setStatus(status);
        BranchEntity updated = branchRepository.save(entity);
        return mapToResponse(updated);
    }

    private BranchResponse mapToResponse(BranchEntity entity) {
        BranchResponse res = new BranchResponse();
        res.setId(entity.getId());
        res.setCode(entity.getCode());
        res.setName(entity.getName());
        res.setAddress(entity.getAddress());
        res.setPhone(entity.getPhone());
        res.setManagerName(entity.getManagerName() != null ? entity.getManagerName() : "N/A");
        res.setStatus(entity.getStatus());
        res.setTablesCount(entity.getTablesCount());
        res.setActiveOrdersCount(0);
        res.setDailyRevenue(entity.getDailyRevenue());
        res.setRating(entity.getRating());
        res.setCreatedAt(entity.getCreatedAt());
        return res;
    }
}
