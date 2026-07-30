import { useAdminStore } from '../../../store/adminStore';

export const useDashboard = () => {
  const { branches, orders, menuItems, selectedBranchId } = useAdminStore();
  const filteredBranches = selectedBranchId === 'ALL'
    ? branches
    : branches.filter((b) => b.id === selectedBranchId);

  return { branches: filteredBranches, orders, menuItems, selectedBranchId };
};
