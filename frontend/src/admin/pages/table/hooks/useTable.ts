import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useTable = () => {
  const { tables } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTables = tables.filter((t) => {
    return filterStatus === 'ALL' || t.status === filterStatus;
  });

  return { tables: filteredTables, filterStatus, setFilterStatus };
};
