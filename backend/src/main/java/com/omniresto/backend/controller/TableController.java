package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.dto.TableDto;
import com.omniresto.backend.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TableController {

    private final TableService tableService;

    @GetMapping
    public ResponseEntity<List<TableDto>> getTablesByBranch(
            @RequestParam String branchId,
            @RequestParam(required = false) TableStatus status
    ) {
        return ResponseEntity.ok(tableService.getTablesByBranch(branchId, status));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TableDto> updateTableStatus(
            @PathVariable String id,
            @RequestParam TableStatus status
    ) {
        return ResponseEntity.ok(tableService.updateTableStatus(id, status));
    }
}
