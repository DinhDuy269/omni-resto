import { useAdminStore } from '../../../store/adminStore';

export const useDashboard = () => {
  const { orders, menu_items, tables, staff_list } = useAdminStore();

  return {
    orders,
    menu_items,
    tables,
    staff_list,
  };
};
