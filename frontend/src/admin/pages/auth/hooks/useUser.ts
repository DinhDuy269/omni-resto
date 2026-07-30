import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useUser = () => {
  const { staffList, branches, addStaff, toggleStaffStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const filteredStaff = staffList.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return { staffList: filteredStaff, branches, searchQuery, setSearchQuery, roleFilter, setRoleFilter, addStaff, toggleStaffStatus };
};
