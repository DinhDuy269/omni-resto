package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.model.table.response.TableResponse;
import com.omniresto.backend.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @GetMapping
    public ResponseEntity<List<TableResponse>> getAllTables(
            @RequestParam(required = false) TableStatus status,
            @RequestParam(required = false) String branchId
    ) {
        return ResponseEntity.ok(tableService.getAllTables(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TableResponse> getTableById(@PathVariable String id) {
        return ResponseEntity.ok(tableService.getTableById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TableResponse> updateTableStatus(
            @PathVariable String id,
            @RequestParam TableStatus status
    ) {
        return ResponseEntity.ok(tableService.updateTableStatus(id, status));
    }

    @PostMapping("/{id}/regenerate-qr")
    public ResponseEntity<TableResponse> regenerateQrToken(@PathVariable String id) {
        return ResponseEntity.ok(tableService.regenerateQrSecretToken(id));
    }
}
