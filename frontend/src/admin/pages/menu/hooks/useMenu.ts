import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';

export const useMenu = () => {
  const { menu_items, addMenuItem, toggleMenuItemStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const filteredItems = menu_items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return {
    menu_items: filteredItems,
    all_menu_items: menu_items,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    addMenuItem,
    toggleMenuItemStatus,
  };
};
