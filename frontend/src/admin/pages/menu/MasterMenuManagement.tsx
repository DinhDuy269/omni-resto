import React, { useState } from 'react';
import { Plus, Search, Star, ToggleLeft, ToggleRight, Edit3 } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import type { MenuCategory, MenuStatus } from '../../../shared/types/admin';

const CATEGORIES: MenuCategory[] = [
  'Phở & Bún',
  'Cơm & Món Chính',
  'Món Ăn Kèm',
  'Đồ Uống',
  'Tráng Miệng',
];

export const MasterMenuManagement: React.FC = () => {
  const { menuItems, addMenuItem, toggleMenuItemStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Phở & Bún' as MenuCategory,
    basePrice: 79000,
    description: '',
    ingredients: '',
    isBestSeller: false,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
  });

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSubmitNewDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    addMenuItem({
      code: formData.code,
      name: formData.name,
      category: formData.category,
      basePrice: Number(formData.basePrice),
      description: formData.description,
      ingredients: formData.ingredients.trim() || undefined,
      status: 'AVAILABLE',
      isBestSeller: formData.isBestSeller,
      image: formData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
    });

    setIsModalOpen(false);
    setFormData({
      code: '',
      name: '',
      category: 'Phở & Bún',
      basePrice: 79000,
      description: '',
      ingredients: '',
      isBestSeller: false,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Title & Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Quản Lý Thực Đơn Chuỗi (Master Menu)
          </h2>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Chuẩn hóa danh mục món ăn, công thức và áp dụng đồng bộ trên tất cả chi nhánh
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={19} />
          Thêm Món Mới Vào Chuỗi
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '380px' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên món hoặc mã (PHO-01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filters - Spacious */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            className={`btn ${activeCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('ALL')}
          >
            Tất Cả Món ({menuItems.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = menuItems.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Dish Catalog Grid - Spacious & Clean */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px' }}>
        {filteredItems.map((dish) => (
          <div
            key={dish.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              padding: '0',
              overflow: 'hidden',
            }}
          >
            {/* Image & Badges */}
            <div style={{ position: 'relative', height: '210px', width: '100%' }}>
              <img
                src={dish.image}
                alt={dish.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <StatusBadge status={dish.status} />
                {dish.isBestSeller && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      fontSize: '0.78125rem',
                      fontWeight: 800,
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-full)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <Star size={13} fill="#ffffff" /> BEST SELLER
                  </span>
                )}
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: '14px',
                  right: '14px',
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '0.78125rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                MÃ: {dish.code}
              </div>
            </div>

            {/* Content Details - Spacious */}
            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              <div>
                <span style={{ fontSize: '0.78125rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {dish.category}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  {dish.name}
                </h3>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.5', flex: 1, margin: 0 }}>
                {dish.description}
              </p>

              {dish.ingredients && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
                  {dish.ingredients.split(',').map((ing, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.72rem',
                        background: 'rgba(232, 93, 38, 0.08)',
                        color: 'var(--primary)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {ing.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.84rem', color: 'var(--text-light)', fontWeight: 600 }}>
                  Phục vụ: <strong>{dish.status === 'AVAILABLE' ? 'Sẵn sàng' : 'Tạm hết'}</strong>
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {dish.basePrice.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const nextStatus: MenuStatus = dish.status === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
                    toggleMenuItemStatus(dish.id, nextStatus);
                  }}
                >
                  {dish.status === 'AVAILABLE' ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                  {dish.status === 'AVAILABLE' ? 'Báo Hết Món' : 'Mở Bán Lại'}
                </button>
                <button className="btn btn-secondary btn-sm btn-icon">
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Dish */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Món Mới Vào Master Menu">
        <form onSubmit={handleSubmitNewDish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Mã Món (Mã SKU)*</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: PHO-05, COM-03"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Danh Mục Món*</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MenuCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tên Món Ăn*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Phở Bò Sườn Cây Đặc Biệt"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Giá Chuẩn Master (VNĐ)*</label>
            <input
              type="number"
              className="form-input"
              step={1000}
              required
              value={formData.basePrice}
              onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mô Tả & Thành Phần Món Ăn</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Mô tả hương vị, nét đặc trưng của món ăn..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Thành Phần & Nguyên Liệu (Phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Thịt bò Wagyu, Nấm hương, Hành lá, Nước hầm xương 24h..."
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
              💡 Hệ thống sẽ tự động tách thành các tag nguyên liệu trên bảng chọn món của thực khách.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">URL Hình Ảnh Món Ăn</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://images.unsplash.com/..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
            <input
              type="checkbox"
              id="bestSeller"
              checked={formData.isBestSeller}
              onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="bestSeller" style={{ fontSize: '0.925rem', fontWeight: 700, cursor: 'pointer' }}>
              Đánh dấu là Món Bán Chạy (Best Seller)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '28px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Món Mới
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
