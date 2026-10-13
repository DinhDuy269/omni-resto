import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useOrder = () => {
  const { orders, updateOrderStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<string>('ALL');

  const filteredOrders = orders.filter((ord) => {
    const matchesStatus = statusTab === 'ALL' || ord.status === statusTab;
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  return { orders: filteredOrders, searchQuery, setSearchQuery, statusTab, setStatusTab, updateOrderStatus };
};
