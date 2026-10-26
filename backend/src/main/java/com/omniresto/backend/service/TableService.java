package com.omniresto.backend.service;

import com.omniresto.backend.domain.OrderEntity;
import com.omniresto.backend.domain.TableEntity;
import com.omniresto.backend.domain.enums.OrderStatus;
import com.omniresto.backend.domain.enums.TableStatus;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.exception.ResourceNotFoundException;
import com.omniresto.backend.model.table.response.TableResponse;
import com.omniresto.backend.repository.OrderRepository;
import com.omniresto.backend.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TableService {

    private final TableRepository tableRepository;
    private final TableSessionService tableSessionService;
    private final OrderRepository orderRepository;

    @Transactional
    public List<TableResponse> getAllTables(TableStatus status) {
        List<TableEntity> tables = status != null
                ? tableRepository.findByStatus(status)
                : tableRepository.findAll();

        boolean anyMissing = false;
        for (TableEntity t : tables) {
            if (t.getQrSecretToken() == null || t.getQrSecretToken().isBlank()) {
                t.setQrSecretToken("qr-token-" + t.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                anyMissing = true;
            }
        }
        if (anyMissing) {
            tableRepository.saveAll(tables);
        }

        return tables.stream().map(this::mapToResponse).toList();
    }

    public TableResponse getTableById(String id) {
        TableEntity entity = findTableById(id);
        if (entity.getQrSecretToken() == null || entity.getQrSecretToken().isBlank()) {
            entity.setQrSecretToken("qr-token-" + entity.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
            entity = tableRepository.save(entity);
        }
        return mapToResponse(entity);
    }

    @Transactional
    public TableResponse updateTableStatus(String id, TableStatus status) {
        TableEntity entity = findTableById(id);
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
        TableEntity entity = findTableById(id);
        // Invalidate old sessions
        tableSessionService.closeSessionsForTable(id, "QR_TOKEN_REGENERATED");

        // Set fresh random secret token
        entity.setQrSecretToken("qr-token-" + entity.getId() + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        TableEntity saved = tableRepository.save(entity);
        return mapToResponse(saved);
    }

    @Transactional
    public TableResponse createTable(String tableNo, Integer capacity) {
        String id = "tbl-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        TableEntity entity = TableEntity.builder()
                .tableNo(tableNo != null && !tableNo.isBlank() ? tableNo : "Bàn Mới")
                .capacity(capacity != null && capacity > 0 ? capacity : 4)
                .status(TableStatus.available)
                .qrSecretToken("qr-token-" + id + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16))
                .build();
        entity.setId(id);
        TableEntity saved = tableRepository.save(entity);
        return mapToResponse(saved);
    }

    @Transactional
    public TableResponse updateTable(String id, String tableNo, Integer capacity) {
        TableEntity entity = findTableById(id);
        if (tableNo != null && !tableNo.isBlank()) {
            entity.setTableNo(tableNo);
        }
        if (capacity != null && capacity > 0) {
            entity.setCapacity(capacity);
        }
        return mapToResponse(tableRepository.save(entity));
    }

    @Transactional
    public void deleteTable(String id) {
        TableEntity entity = findTableById(id);
        if (entity.getStatus() == TableStatus.occupied || entity.getStatus() == TableStatus.OCCUPIED) {
            throw new BadRequestException("Không thể xóa bàn đang có khách dùng bữa (OCCUPIED)! Vui lòng trả bàn trước khi xóa.");
        }

        List<OrderEntity> activeOrders = orderRepository.findByTableIdAndStatusNotIn(
                id,
                List.of(OrderStatus.completed, OrderStatus.cancelled)
        );
        if (!activeOrders.isEmpty()) {
            throw new BadRequestException("Không thể xóa bàn vì đang có đơn hàng chưa hoàn tất! Vui lòng thanh toán hoặc hủy đơn trước khi xóa.");
        }

        tableRepository.delete(entity);
    }

    private TableEntity findTableById(String id) {
        return tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID: " + id));
    }

    private TableResponse mapToResponse(TableEntity entity) {
        TableResponse res = new TableResponse();
        res.setId(entity.getId());
        res.setTableNo(entity.getTableNo());
        res.setCapacity(entity.getCapacity());
        res.setStatus(entity.getStatus());
        res.setQrSecretToken(entity.getQrSecretToken());

        boolean isOccupied = entity.getStatus() == TableStatus.occupied || entity.getStatus() == TableStatus.OCCUPIED;
        if (!isOccupied) {
            res.setCurrentOrderAmount(BigDecimal.ZERO);
            res.setOccupiedSince(null);
            return res;
        }

        // Tính toán số tiền và thời gian thực từ các đơn hàng đang dùng bữa
        List<OrderEntity> activeOrders = orderRepository.findByTableIdAndStatusNotIn(
                entity.getId(),
                List.of(OrderStatus.completed, OrderStatus.cancelled)
        );

        if (activeOrders.isEmpty() && entity.getTableNo() != null) {
            activeOrders = orderRepository.findByTableNoAndStatusNotIn(
                    entity.getTableNo(),
                    List.of(OrderStatus.completed, OrderStatus.cancelled)
            );
        }

        if (activeOrders.isEmpty()) {
            res.setCurrentOrderAmount(BigDecimal.ZERO);
            res.setOccupiedSince("Vừa vào bàn");
        } else {
            BigDecimal total = activeOrders.stream()
                    .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            res.setCurrentOrderAmount(total);

            LocalDateTime earliest = activeOrders.stream()
                    .map(OrderEntity::getCreatedAt)
                    .filter(java.util.Objects::nonNull)
                    .min(LocalDateTime::compareTo)
                    .orElse(LocalDateTime.now());

            long minutesAgo = Duration.between(earliest, LocalDateTime.now()).toMinutes();
            if (minutesAgo < 1) {
                res.setOccupiedSince("Vừa vào bàn");
            } else if (minutesAgo < 60) {
                res.setOccupiedSince(minutesAgo + " phút trước");
            } else {
                long hoursAgo = minutesAgo / 60;
                long remainMin = minutesAgo % 60;
                res.setOccupiedSince(hoursAgo + " giờ " + (remainMin > 0 ? remainMin + "p " : "") + "trước");
            }
        }

        return res;
    }
}
