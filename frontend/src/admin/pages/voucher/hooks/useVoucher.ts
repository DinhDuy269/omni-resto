import { useState, useMemo } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useVoucher = () => {
  // 1. Kéo dữ liệu và hàm từ Store ra
  const { vouchers, toggleVoucherStatus } = useAdminStore();

  // 2. State cho các bộ lọc
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Logic lọc tự động
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchStatus = filterStatus === 'all' || v.status === filterStatus;
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
      active: vouchers.filter((v) => v.status === 'active').length,
      inactive: vouchers.filter((v) => v.status === 'inactive').length,
      expired: vouchers.filter((v) => v.status === 'expired').length,
    };
  }, [vouchers]);

  return { 
    vouchers: filteredVouchers, 
    summaryCount,
    filterStatus, 
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    toggleVoucherStatus,
  };
};
