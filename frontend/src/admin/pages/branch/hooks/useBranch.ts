import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useBranch = () => {
  const { branches, addBranch, updateBranchStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return { branches: filteredBranches, searchQuery, setSearchQuery, statusFilter, setStatusFilter, addBranch, updateBranchStatus };
};
