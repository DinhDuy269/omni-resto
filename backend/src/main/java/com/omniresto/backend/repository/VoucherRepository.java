package com.omniresto.backend.repository;

import com.omniresto.backend.domain.VoucherEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<VoucherEntity, String> {
    
    // Tìm voucher theo mã code (VD: KHUYENMAI20)
    Optional<VoucherEntity> findByCode(String code);

    // Lấy danh sách các voucher ĐANG CÓ HIỆU LỰC (còn hạn, còn lượt, trạng thái ACTIVE)
    @Query("SELECT v FROM VoucherEntity v WHERE v.status = 'ACTIVE' " +
           "AND v.startDate <= :now AND v.endDate >= :now " +
           "AND v.usedQuantity < v.totalQuantity")
    List<VoucherEntity> findAvailableVouchers(@Param("now") LocalDateTime now);
}