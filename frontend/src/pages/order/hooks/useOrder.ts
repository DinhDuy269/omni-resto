import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useOrder = () => {
  const { orders, selectedBranchId, updateOrderStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');

  const filteredOrders = orders.filter((ord) => {
    const matchesBranch = selectedBranchId === 'ALL' || ord.branchId === selectedBranchId;
    const matchesStatus = statusTab === 'ALL' || ord.status === statusTab;
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBranch && matchesStatus && matchesSearch;
  });

  return { orders: filteredOrders, searchQuery, setSearchQuery, statusTab, setStatusTab, updateOrderStatus };
};
