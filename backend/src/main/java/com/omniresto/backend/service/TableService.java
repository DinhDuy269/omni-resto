package com.omniresto.backend.service;

import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.table.response.TableResponse;
import com.omniresto.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TableService {

    private final TableRepository tableRepository;
    private final TableSessionService tableSessionService;

    public List<TableResponse> getAllTables(TableStatus status) {
        List<TableEntity> tables = status != null
                ? tableRepository.findByStatus(status)
                : tableRepository.findAll();

        // Ensure every table has a qrSecretToken
        tables.forEach(t -> {
            if (t.getQrSecretToken() == null || t.getQrSecretToken().isBlank()) {
                t.setQrSecretToken("qr-token-" + t.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                tableRepository.save(t);
            }
        });

        return tables.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<TableResponse> getTablesByBranch(String branchId, TableStatus status) {
        return getAllTables(status);
    }

    public TableResponse getTableById(String id) {
        TableEntity entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID: " + id));
        if (entity.getQrSecretToken() == null || entity.getQrSecretToken().isBlank()) {
            entity.setQrSecretToken("qr-token-" + entity.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
            entity = tableRepository.save(entity);
        }
        return mapToResponse(entity);
    }

    @Transactional
    public TableResponse updateTableStatus(String id, TableStatus status) {
        TableEntity entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID: " + id));
        entity.setStatus(status);

        // If table is paid / cleaning / available -> Automatically close active sessions
        if (status == TableStatus.available || status == TableStatus.cleaning) {
            tableSessionService.closeSessionsForTable(id, "TABLE_STATUS_" + status.name());
        }

        TableEntity updated = tableRepository.save(entity);
        return mapToResponse(updated);
    }

    @Transactional
    public TableResponse regenerateQrSecretToken(String id) {
        TableEntity entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID: " + id));
        // Invalidate old sessions
        tableSessionService.closeSessionsForTable(id, "QR_TOKEN_REGENERATED");

        // Set fresh random secret token
        entity.setQrSecretToken("qr-token-" + entity.getId() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        TableEntity saved = tableRepository.save(entity);
        return mapToResponse(saved);
    }

    private TableResponse mapToResponse(TableEntity entity) {
        TableResponse res = new TableResponse();
        res.setId(entity.getId());
        res.setTableNo(entity.getTableNo());
        res.setCapacity(entity.getCapacity());
        res.setStatus(entity.getStatus());
        res.setQrSecretToken(entity.getQrSecretToken());
        res.setCurrentOrderAmount(BigDecimal.valueOf(150000));
        res.setOccupiedSince("15 phút trước");
        return res;
    }
}
