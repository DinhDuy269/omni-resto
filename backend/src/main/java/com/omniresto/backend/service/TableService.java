package com.omniresto.backend.service;

import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.dto.TableDto;
import com.omniresto.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final TableRepository tableRepository;

    public List<TableDto> getTablesByBranch(String branchId, TableStatus status) {
        List<TableEntity> tables;
        if (status != null) {
            tables = tableRepository.findByBranchIdAndStatus(branchId, status);
        } else {
            tables = tableRepository.findByBranchId(branchId);
        }
        return tables.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public TableDto updateTableStatus(String tableId, TableStatus status) {
        TableEntity entity = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Table not found with id: " + tableId));
        entity.setStatus(status);
        return mapToDto(tableRepository.save(entity));
    }

    private TableDto mapToDto(TableEntity entity) {
        return TableDto.builder()
                .id(entity.getId())
                .branchId(entity.getBranchId())
                .tableNo(entity.getTableNo())
                .capacity(entity.getCapacity())
                .status(entity.getStatus())
                .currentOrderId(entity.getCurrentOrderId())
                .build();
    }
}
