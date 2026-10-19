import { useState, useMemo } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useVoucher = () => {
  // 1. Kéo dữ liệu và hàm từ Store ra
  const { vouchers, toggleVoucherStatus } = useAdminStore();

  // 2. State cho các bộ lọc
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Logic lọc tự động
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchStatus = filterStatus === 'ALL' || v.status === filterStatus;
      const matchSearch = 
        v.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.name.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchStatus && matchSearch;
    });
  }, [vouchers, filterStatus, searchQuery]);

  // 4. Tính toán số liệu trên Badges
  const summaryCount = useMemo(() => {
    return {
      all: vouchers.length,
      active: vouchers.filter(v => v.status === 'ACTIVE').length,
      inactive: vouchers.filter(v => v.status === 'INACTIVE').length,
      expired: vouchers.filter(v => v.status === 'EXPIRED').length,
    }
  }, [vouchers]);

  return { 
    vouchers: filteredVouchers, 
    summaryCount,
    filterStatus, 
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    toggleVoucherStatus // Trả hàm này ra cho UI dùng
  };
};