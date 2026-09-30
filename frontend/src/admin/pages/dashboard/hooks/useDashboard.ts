import { useAdminStore } from '../../../store/adminStore';

export const useDashboard = () => {
  const { orders, menuItems, tables, staffList } = useAdminStore();

  return { orders, menuItems, tables, staffList };
};
