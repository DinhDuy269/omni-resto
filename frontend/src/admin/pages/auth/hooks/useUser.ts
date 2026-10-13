import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useUser = () => {
  const { staff_list, addStaff, toggleStaffStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const filteredStaff = staff_list.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return { staff_list: filteredStaff, searchQuery, setSearchQuery, roleFilter, setRoleFilter, addStaff, toggleStaffStatus };
};
