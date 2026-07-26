import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useMenu = () => {
  const { menuItems, addMenuItem, toggleMenuItemStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return {
    menuItems: filteredItems,
    allMenuItems: menuItems,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    addMenuItem,
    toggleMenuItemStatus,
  };
};
