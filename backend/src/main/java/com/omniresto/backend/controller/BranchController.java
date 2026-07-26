package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.BranchStatus;
import com.omniresto.backend.model.branch.request.BranchRequest;
import com.omniresto.backend.model.branch.response.BranchResponse;
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
    public ResponseEntity<List<BranchResponse>> getAllBranches() {
        return ResponseEntity.ok(branchService.getAllBranches());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BranchResponse> getBranchById(@PathVariable String id) {
        return ResponseEntity.ok(branchService.getBranchById(id));
    }

    @PostMapping
    public ResponseEntity<BranchResponse> createBranch(@RequestBody BranchRequest request) {
        return ResponseEntity.ok(branchService.createBranch(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BranchResponse> updateBranchStatus(
            @PathVariable String id,
            @RequestParam BranchStatus status
    ) {
        return ResponseEntity.ok(branchService.updateBranchStatus(id, status));
    }
}
