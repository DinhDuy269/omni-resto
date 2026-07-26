package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.BranchStatus;
import com.omniresto.backend.dto.BranchDto;
import com.omniresto.backend.service.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BranchController {

    private final BranchService branchService;

    @GetMapping
    public ResponseEntity<List<BranchDto>> getAllBranches() {
        return ResponseEntity.ok(branchService.getAllBranches());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BranchDto> getBranchById(@PathVariable String id) {
        return ResponseEntity.ok(branchService.getBranchById(id));
    }

    @PostMapping
    public ResponseEntity<BranchDto> createBranch(@RequestBody BranchDto dto) {
        return ResponseEntity.ok(branchService.createBranch(dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BranchDto> updateBranchStatus(
            @PathVariable String id,
            @RequestParam BranchStatus status
    ) {
        return ResponseEntity.ok(branchService.updateBranchStatus(id, status));
    }
}
