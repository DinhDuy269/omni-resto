package com.omniresto.backend.service;

import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.model.table.request.TableRequest;
import com.omniresto.backend.model.table.response.TableResponse;
import com.omniresto.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final TableRepository tableRepository;

    public List<TableResponse> getTablesByBranch(String branchId, TableStatus status) {
        List<TableEntity> tables = tableRepository.findByBranchId(branchId);
        if (status != null) {
            tables = tables.stream().filter(t -> t.getStatus() == status).collect(Collectors.toList());
        }
        return tables.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public TableResponse updateTableStatus(String id, TableStatus status) {
        TableEntity entity = tableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Table not found: " + id));
        entity.setStatus(status);
        TableEntity updated = tableRepository.save(entity);
        return mapToResponse(updated);
    }

    private TableResponse mapToResponse(TableEntity entity) {
        TableResponse res = new TableResponse();
        res.setId(entity.getId());
        res.setTableNo(entity.getTableNo());
        res.setBranchId(entity.getBranchId());
        res.setCapacity(entity.getCapacity());
        res.setStatus(entity.getStatus());
        res.setCurrentOrderAmount(BigDecimal.valueOf(150000));
        res.setOccupiedSince("15 phút trước");
        return res;
    }
}
