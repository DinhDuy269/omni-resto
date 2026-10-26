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

    @PostMapping
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public TableResponse createTable(@RequestBody com.omniresto.backend.model.table.request.TableRequest request) {
        return tableService.createTable(request.getTableNo(), request.getCapacity());
    }

    @PutMapping("/{id}")
    public TableResponse updateTable(
            @PathVariable String id,
            @RequestBody com.omniresto.backend.model.table.request.TableRequest request
    ) {
        return tableService.updateTable(id, request.getTableNo(), request.getCapacity());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void deleteTable(@PathVariable String id) {
        tableService.deleteTable(id);
    }

    @PostMapping("/{id}/regenerate-qr")
    public TableResponse regenerateQrToken(@PathVariable String id) {
        return tableService.regenerateQrSecretToken(id);
    }
}
