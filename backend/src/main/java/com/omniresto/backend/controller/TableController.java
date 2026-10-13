package com.omniresto.backend.controller;

import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.model.table.response.TableResponse;
import com.omniresto.backend.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @GetMapping
    public List<TableResponse> getAllTables(
            @RequestParam(required = false) TableStatus status,
            @RequestParam(required = false) String branchId
    ) {
        return tableService.getAllTables(status);
    }

    @GetMapping("/{id}")
    public TableResponse getTableById(@PathVariable String id) {
        return tableService.getTableById(id);
    }

    @PatchMapping("/{id}/status")
    public TableResponse updateTableStatus(
            @PathVariable String id,
            @RequestParam TableStatus status
    ) {
        return tableService.updateTableStatus(id, status);
    }

    @PostMapping("/{id}/regenerate-qr")
    public TableResponse regenerateQrToken(@PathVariable String id) {
        return tableService.regenerateQrSecretToken(id);
    }
}
