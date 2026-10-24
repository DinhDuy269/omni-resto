package com.omniresto.backend.repository;

import com.omniresto.backend.domain.VoucherEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<VoucherEntity, String> {

    Optional<VoucherEntity> findByCode(String code);
    Optional<VoucherEntity> findByCodeIgnoreCase(String code);

    // Lấy danh sách các voucher ĐANG CÓ HIỆU LỰC (còn hạn, còn lượt, trạng thái ACTIVE)
    @Query("SELECT v FROM VoucherEntity v WHERE v.status = 'ACTIVE' " +
           "AND v.startDate <= :now AND v.endDate >= :now " +
           "AND v.usedQuantity < v.totalQuantity")
    List<VoucherEntity> findAvailableVouchers(@Param("now") LocalDateTime now);

    /**
     * Tăng số lượng nguyên tử và xóa sạch cache Hibernate Persistence Context
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE VoucherEntity v SET v.usedQuantity = v.usedQuantity + 1 " +
           "WHERE v.id = :id AND v.usedQuantity < v.totalQuantity")
    int incrementUsedQuantityAtomic(@Param("id") String id);

    /**
     * Hoàn lại lượt dùng khi hủy đơn hàng (Idempotent compensation)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE VoucherEntity v SET v.usedQuantity = v.usedQuantity - 1 " +
           "WHERE v.id = :id AND v.usedQuantity > 0")
    int decrementUsedQuantityAtomic(@Param("id") String id);
}