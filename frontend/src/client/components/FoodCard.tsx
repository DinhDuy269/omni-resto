import React from 'react';
import type { MenuItem } from '../../shared/types/customer';

interface FoodCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onAddToCart }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between border border-gray-100">
      <div>
        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
          <img
            src={item.image || 'https://via.placeholder.com/300x200?text=No+Image'}
            alt={item.name}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
          />
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold bg-red-600 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                Hết món
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-1">{item.name}</h3>
          <p className="text-gray-500 text-sm line-clamp-2 mb-3 min-h-[40px]">
            {item.description || 'Món ăn thơm ngon chế biến từ nguyên liệu tươi sạch.'}
          </p>
        </div>
      </div>

      <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-50 mt-auto">
        <span className="text-orange-600 font-extrabold text-lg">
          {item.price.toLocaleString('vi-VN')} đ
        </span>
        <button
          onClick={() => onAddToCart(item)}
          disabled={!item.isAvailable}
          className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition duration-150 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          + Thêm
        </button>
      </div>
    </div>
  );
};