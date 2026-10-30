import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Star,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  Utensils,
  Layers,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
  Clock,
  RotateCcw,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { useAdminStore, DISH_CATEGORIES } from '../../store/adminStore';
import { Modal } from '../../../shared/components/Modal';
import { uploadApi } from '../../../shared/api/uploadApi';
import { getOptimizedImageUrl } from '../../../shared/utils/cloudinaryUtils';
import type { MenuCategory, MenuStatus, MenuItem, CategoryOption } from '../../../shared/types/admin';

const CATEGORIES: MenuCategory[] = [
  'Phở & Bún Nước',
  'Cơm Tấm & Món Mặn',
  'Bánh Mì & Điểm Tâm',
  'Lẩu & Món Nhắm',
  'Khai Vị & Gỏi Cuốn',
  'Đồ Uống & Cà Phê',
  'Tráng Miệng & Chè',
  'Món Chay Thanh Tịnh',
  'Hải Sản Tươi Sống',
  'Combo Tiết Kiệm',
];

const MEAL_PERIOD_OPTIONS = [
  { value: 'ALL_DAY', label: 'Cả Ngày (Toàn Thời Gian)' },
  { value: 'MORNING', label: 'Điểm Tâm Sáng (06:00 - 10:30)' },
  { value: 'NOON', label: 'Cơm Trưa (10:30 - 14:30)' },
  { value: 'EVENING', label: 'Bữa Tối & Nhậu (17:00 - 23:00)' },
];

export const MasterMenuManagement: React.FC = () => {
  const {
    menu_items,
    category_options,
    fetchInitialData,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemStatus,
    addCategoryOption,
    updateCategoryOption,
    deleteCategoryOption,
    toggleCategoryOptionStatus,
  } = useAdminStore();

  // Cloudinary / Cloud Sync states
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputAddRef = useRef<HTMLInputElement | null>(null);
  const fileInputEditRef = useRef<HTMLInputElement | null>(null);

  // Active top-level sub-view: 'DISHES' or 'OPTIONS'
  const [activeTab, setActiveTab] = useState<'DISHES' | 'OPTIONS'>('DISHES');

  // View Mode for Dishes: 'TABLE' or 'GRID' (Default: TABLE for fast admin overview)
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  // Search & Filter for Dishes
  const [dishSearch, setDishSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [dishMealPeriodFilter, setDishMealPeriodFilter] = useState<string>('ALL');
  const [dishStatusFilter, setDishStatusFilter] = useState<string>('ALL');
  // Search & Filter for Category Options
  const [optionSearch, setOptionSearch] = useState('');
  const [optionCategoryFilter, setOptionCategoryFilter] = useState<string>('ALL');
  const [optionTypeFilter, setOptionTypeFilter] = useState<string>('ALL');

  // Dish Modals State
  const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);

  const [dishFormData, setDishFormData] = useState({
    code: '',
    name: '',
    category: 'Phở & Bún Nước' as MenuCategory,
    base_price: 79000,
    meal_periods: 'ALL_DAY',
    description: '',
    ingredients: '',
    is_best_seller: false,
    image: '/images/food-placeholder.svg',
  });

  // Option Modals State
  const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<CategoryOption | null>(null);

  const [optionFormData, setOptionFormData] = useState({
    category_id: 'cat-01',
    name: '',
    option_type: 'topping' as 'size' | 'topping',
    price: 10000,
    status: 'available',
  });

  // Helper format ca phục vụ
  const formatMealPeriodBadge = (periods?: string) => {
    if (!periods) {
      return { label: 'Cả ngày (06h - 22h)', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' };
    }
    const p = periods.toUpperCase();
    if (p.includes('ALL_DAY') || p.includes('ALLDAY') || (p.includes('MORNING') && p.includes('NOON') && p.includes('EVENING'))) {
      return { label: 'Cả ngày (06h - 22h)', color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' };
    }
    const labels: string[] = [];
    if (p.includes('MORNING')) labels.push('Sáng');
    if (p.includes('NOON')) labels.push('Trưa');
    if (p.includes('EVENING')) labels.push('Tối');
    if (p.includes('LATE_NIGHT') || p.includes('NIGHT')) labels.push('Khuya');
    return {
      label: labels.length > 0 ? labels.join(' & ') : periods,
      color: '#ea580c',
      bg: 'rgba(234, 88, 12, 0.1)'
    };
  };

  // Filtered Dishes
  const filteredDishes = menu_items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(dishSearch.toLowerCase()) ||
      (item.ingredients && item.ingredients.toLowerCase().includes(dishSearch.toLowerCase()));
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesPeriod =
      dishMealPeriodFilter === 'ALL' ||
      (item.meal_periods && item.meal_periods.toUpperCase().includes(dishMealPeriodFilter));
    const matchesStatus =
      dishStatusFilter === 'ALL' ||
      (dishStatusFilter === 'available' && item.status === 'available') ||
      (dishStatusFilter === 'out_of_stock' && item.status === 'out_of_stock');
    return matchesSearch && matchesCategory && matchesPeriod && matchesStatus;
  });

  // Filtered Options
  const filteredOptions = category_options.filter((opt) => {
    const matchesSearch = opt.name.toLowerCase().includes(optionSearch.toLowerCase());
    const matchesCat = optionCategoryFilter === 'ALL' || opt.category_id === optionCategoryFilter;
    const matchesType = optionTypeFilter === 'ALL' || opt.option_type === optionTypeFilter;
    return matchesSearch && matchesCat && matchesType;
  });

  // Handlers for Cloudinary Upload & Migration
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Kiểm tra kích thước file tối đa 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn 5MB!`);
      e.target.value = '';
      return;
    }

    // 2. Kiểm tra định dạng ảnh hợp lệ
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Định dạng file không hợp lệ! Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.');
      e.target.value = '';
      return;
    }

    // 3. Tạo preview cục bộ tức thì và giải phóng bộ nhớ khi hoàn tất
    const previewUrl = URL.createObjectURL(file);
    setDishFormData((prev) => ({ ...prev, image: previewUrl }));

    try {
      setIsUploadingImg(true);
      setUploadError(null);
      const res = await uploadApi.uploadImage(file);
      setDishFormData((prev) => ({ ...prev, image: res.url }));
    } catch (err: any) {
      setUploadError(err?.error_description || 'Không thể tải ảnh lên hệ thống lưu trữ.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleMigrateCloudImages = async () => {
    if (!window.confirm('Hệ thống sẽ quét toàn bộ món ăn và đồng bộ các ảnh sang Cloud Storage / Cloudinary để bảo toàn dữ liệu vĩnh viễn. Tiếp tục?')) {
      return;
    }

    try {
      setIsMigrating(true);
      setMigrationStatus('Đang đồng bộ ảnh món ăn sang Cloudinary...');
      const res = await uploadApi.migrateMenuImages();
      setMigrationStatus(
        res.message ||
        `Hoàn tất đồng bộ Cloud! Đã xử lý ${res.total_processed} món (Thành công: ${res.successful}, Bỏ qua: ${res.skipped}, Thất bại: ${res.failed}).`
      );
      await fetchInitialData();
    } catch (err: any) {
      setMigrationStatus(`Đồng bộ thất bại: ${err?.error_description || 'Lỗi kết nối máy chủ.'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Handlers for Dish
  const handleOpenAddDish = () => {
    setDishFormData({
      code: `M-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'Phở & Bún Nước',
      base_price: 65000,
      meal_periods: 'ALL_DAY',
      description: '',
      ingredients: '',
      is_best_seller: false,
      image: '/images/food-placeholder.svg',
    });
    setIsAddDishModalOpen(true);
  };

  const handleOpenEditDish = (dish: MenuItem) => {
    setEditingDish(dish);
    setDishFormData({
      code: dish.code,
      name: dish.name,
      category: dish.category as MenuCategory,
      base_price: dish.base_price,
      meal_periods: dish.meal_periods || 'ALL_DAY',
      description: dish.description || '',
      ingredients: dish.ingredients || '',
      is_best_seller: Boolean(dish.is_best_seller),
      image: dish.image,
    });
  };

  const handleSubmitNewDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishFormData.name || !dishFormData.code) return;

    addMenuItem({
      code: dishFormData.code,
      name: dishFormData.name,
      category: dishFormData.category,
      base_price: Number(dishFormData.base_price),
      meal_periods: dishFormData.meal_periods,
      description: dishFormData.description,
      ingredients: dishFormData.ingredients.trim() || undefined,
      status: 'available',
      is_best_seller: dishFormData.is_best_seller,
      image: dishFormData.image || '/images/food-placeholder.svg',
    });

    setIsAddDishModalOpen(false);
  };

  const handleSubmitEditDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDish || !dishFormData.name) return;

    updateMenuItem({
      ...editingDish,
      code: dishFormData.code,
      name: dishFormData.name,
      category: dishFormData.category,
      base_price: Number(dishFormData.base_price),
      meal_periods: dishFormData.meal_periods,
      description: dishFormData.description,
      ingredients: dishFormData.ingredients.trim() || undefined,
      is_best_seller: dishFormData.is_best_seller,
      image: dishFormData.image,
    });

    setEditingDish(null);
  };

  const handleDeleteDish = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn chuỗi?`)) {
      deleteMenuItem(id);
    }
  };

  // Handlers for Category Options
  const handleOpenAddOption = () => {
    setOptionFormData({
      category_id: optionCategoryFilter !== 'ALL' ? optionCategoryFilter : 'cat-pho',
      name: '',
      option_type: 'topping',
      price: 10000,
      status: 'available',
    });
    setIsAddOptionModalOpen(true);
  };

  const handleOpenEditOption = (option: CategoryOption) => {
    setEditingOption(option);
    setOptionFormData({
      category_id: option.category_id || 'cat-pho',
      name: option.name,
      option_type: (option.option_type?.toLowerCase() || 'topping') as 'size' | 'topping',
      price: option.price,
      status: option.status,
    });
  };

  const handleSubmitNewOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionFormData.name) return;

    addCategoryOption({
      category_id: optionFormData.category_id,
      name: optionFormData.name,
      option_type: optionFormData.option_type,
      price: Number(optionFormData.price),
      status: optionFormData.status,
    });

    setIsAddOptionModalOpen(false);
  };

  const handleSubmitEditOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOption || !optionFormData.name) return;

    updateCategoryOption({
      ...editingOption,
      category_id: optionFormData.category_id,
      name: optionFormData.name,
      option_type: optionFormData.option_type,
      price: Number(optionFormData.price),
      status: optionFormData.status,
    });

    setEditingOption(null);
  };

  const handleDeleteOption = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tùy chọn "${name}"?`)) {
      deleteCategoryOption(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Quản Lý Thực Đơn Chuỗi (Master Menu)
          </h2>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Chuẩn hóa danh mục món ăn, tùy chọn kích cỡ, topping và áp dụng đồng bộ trên toàn chuỗi
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '4px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              className={`btn btn-sm ${activeTab === 'DISHES' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setActiveTab('DISHES')}
            >
              <Utensils size={16} />
              <span>Danh Mục Món Ăn ({menu_items.length})</span>
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'OPTIONS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setActiveTab('OPTIONS')}
            >
              <Layers size={16} />
              <span>Kích Cỡ & Topping ({category_options.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={handleMigrateCloudImages}
              disabled={isMigrating}
              title="Quét và đồng bộ tất cả ảnh món ăn sang Cloudinary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isMigrating ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <span>{isMigrating ? 'Đang đồng bộ...' : 'Đồng Bộ Ảnh Cloud'}</span>
            </button>
            <button
              className={`btn ${activeTab === 'DISHES' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab('DISHES');
                handleOpenAddDish();
              }}
            >
              <Plus size={18} />
              <span>Thêm Món Mới</span>
            </button>
            <button
              className={`btn ${activeTab === 'OPTIONS' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setActiveTab('OPTIONS');
                handleOpenAddOption();
              }}
            >
              <Plus size={18} />
              <span>Thêm Topping / Size</span>
            </button>
          </div>
        </div>

        {migrationStatus && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: migrationStatus.includes('thất bại') ? '#fee2e2' : '#f0fdf4',
              color: migrationStatus.includes('thất bại') ? '#dc2626' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span>{migrationStatus}</span>
            <button
              onClick={() => setMigrationStatus(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: DANH MỤC MÓN ĂN (DISHES)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'DISHES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics KPI Counters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '14px',
            }}
          >
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(232, 93, 38, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Utensils size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Tổng thực đơn</span>
                <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)', lineHeight: 1.2 }}>{menu_items.length} món</strong>
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Đang mở bán</span>
                <strong style={{ fontSize: '1.35rem', color: '#16a34a', lineHeight: 1.2 }}>
                  {menu_items.filter((m) => m.status === 'available').length} món
                </strong>
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Tạm hết món</span>
                <strong style={{ fontSize: '1.35rem', color: '#dc2626', lineHeight: 1.2 }}>
                  {menu_items.filter((m) => m.status === 'out_of_stock').length} món
                </strong>
              </div>
            </div>

            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star size={20} fill="#d97706" />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>Món bán chạy</span>
                <strong style={{ fontSize: '1.35rem', color: '#d97706', lineHeight: 1.2 }}>
                  {menu_items.filter((m) => m.is_best_seller).length} món
                </strong>
              </div>
            </div>
          </div>

          {/* Search, Filter Toolbar & View Mode Switcher */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div className="search-bar" style={{ width: '320px', minWidth: '220px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm theo tên món, mã SKU, nguyên liệu..."
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                />
                {dishSearch && (
                  <button
                    onClick={() => setDishSearch('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Multi-Filters: Ca bán & Trạng thái */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Lọc Ca bán */}
                <select
                  value={dishMealPeriodFilter}
                  onChange={(e) => setDishMealPeriodFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  title="Lọc theo khung giờ / ca phục vụ"
                >
                  <option value="ALL">🕒 Tất Cả Khung Giờ</option>
                  <option value="ALL_DAY">☕ Cả Ngày (Đồ uống / 06h - 22h)</option>
                  <option value="MORNING">☀️ Điểm Tâm Sáng (06h - 10h30)</option>
                  <option value="NOON">🍚 Bữa Trưa (10h30 - 14h30)</option>
                  <option value="EVENING">🍲 Bữa Tối & Lẩu (16h30 - 22h)</option>
                </select>

                {/* Lọc Trạng thái */}
                <select
                  value={dishStatusFilter}
                  onChange={(e) => setDishStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  title="Lọc theo trạng thái món"
                >
                  <option value="ALL">⚡ Tất Cả Trạng Thái</option>
                  <option value="available">🟢 Đang Mở Bán</option>
                  <option value="out_of_stock">🔴 Tạm Hết Món</option>
                </select>

                {(dishSearch || dishMealPeriodFilter !== 'ALL' || dishStatusFilter !== 'ALL' || activeCategory !== 'ALL') && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setDishSearch('');
                      setDishMealPeriodFilter('ALL');
                      setDishStatusFilter('ALL');
                      setActiveCategory('ALL');
                    }}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Đặt lại tất cả bộ lọc"
                  >
                    <RotateCcw size={14} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* View Mode Switcher: TABLE vs GRID */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-app)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  gap: '2px',
                }}
              >
                <button
                  className={`btn btn-sm ${viewMode === 'TABLE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: viewMode === 'TABLE' ? 700 : 500,
                  }}
                  onClick={() => setViewMode('TABLE')}
                  title="Xem dạng Bảng dữ liệu (Nhanh gọn, mật độ thông tin cao)"
                >
                  <List size={16} />
                  <span>Bảng</span>
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'GRID' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    border: 'none',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: viewMode === 'GRID' ? 700 : 500,
                  }}
                  onClick={() => setViewMode('GRID')}
                  title="Xem dạng Lưới thẻ gọn"
                >
                  <LayoutGrid size={16} />
                  <span>Thẻ gọn</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <button
                className={`btn btn-sm ${activeCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)', padding: '5px 14px', fontSize: '0.82rem' }}
                onClick={() => setActiveCategory('ALL')}
              >
                Tất Cả Danh Mục ({menu_items.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = menu_items.filter((m) => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '5px 14px', fontSize: '0.82rem' }}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            <span>
              Tìm thấy <strong style={{ color: 'var(--text-main)' }}>{filteredDishes.length}</strong> / {menu_items.length} món ăn
              {activeCategory !== 'ALL' && ` · Thuộc "${activeCategory}"`}
              {dishMealPeriodFilter !== 'ALL' && ` · Lọc theo ca`}
              {dishStatusFilter !== 'ALL' && ` · ${dishStatusFilter === 'available' ? 'Đang mở bán' : 'Tạm hết món'}`}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
              * Mẹo: Click trực tiếp vào nút trạng thái để Đổi nhanh Sẵn sàng / Hết món
            </span>
          </div>

          {/* ──────────────────────────────────────────
              VIEW MODE 1: DATA TABLE (BẢNG DANH SÁCH)
             ────────────────────────────────────────── */}
          {viewMode === 'TABLE' && (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', width: '330px' }}>
                        MÓN ĂN & MÃ SKU
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        DANH MỤC
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                        KHUNG GIỜ PHỤC VỤ
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>
                        GIÁ BÁN
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center', width: '150px' }}>
                        TRẠNG THÁI (BẬT/TẮT)
                      </th>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right', width: '100px' }}>
                        THAO TÁC
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDishes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                          Không tìm thấy món ăn nào phù hợp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredDishes.map((dish) => {
                        const isAvailable = dish.status === 'available';
                        const periodBadge = formatMealPeriodBadge(dish.meal_periods);
                        return (
                          <tr
                            key={dish.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background-color 0.15s ease',
                              backgroundColor: isAvailable ? 'transparent' : 'rgba(239, 68, 68, 0.02)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-subtle)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isAvailable ? 'transparent' : 'rgba(239, 68, 68, 0.02)')}
                          >
                            {/* Món ăn & SKU */}
                            <td style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ position: 'relative', width: '46px', height: '46px', flexShrink: 0 }}>
                                  <img
                                    src={getOptimizedImageUrl(dish.image, { width: 100, height: 100 })}
                                    alt={dish.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                      border: '1px solid var(--border-subtle)',
                                      opacity: isAvailable ? 1 : 0.6,
                                    }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = '/images/food-placeholder.svg';
                                    }}
                                  />
                                  {dish.is_best_seller && (
                                    <div
                                      title="Món bán chạy (Best Seller)"
                                      style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f59e0b',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                      }}
                                    >
                                      <Star size={10} fill="#fff" />
                                    </div>
                                  )}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-app)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-subtle)',
                                      }}
                                    >
                                      {dish.code}
                                    </span>
                                    <strong
                                      style={{
                                        fontSize: '0.9rem',
                                        color: isAvailable ? 'var(--text-main)' : 'var(--text-muted)',
                                        textDecoration: isAvailable ? 'none' : 'line-through',
                                      }}
                                    >
                                      {dish.name}
                                    </strong>
                                  </div>
                                  {dish.description && (
                                    <p
                                      style={{
                                        fontSize: '0.76rem',
                                        color: 'var(--text-light)',
                                        margin: '3px 0 0',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '260px',
                                      }}
                                      title={dish.description}
                                    >
                                      {dish.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Danh mục */}
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(232, 93, 38, 0.08)',
                                  color: 'var(--primary)',
                                  border: '1px solid rgba(232, 93, 38, 0.18)',
                                }}
                              >
                                {dish.category}
                              </span>
                            </td>

                            {/* Ca phục vụ */}
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: periodBadge.bg,
                                  color: periodBadge.color,
                                }}
                              >
                                <Clock size={12} />
                                {periodBadge.label}
                              </span>
                            </td>

                            {/* Giá bán */}
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                                {(dish.base_price || 0).toLocaleString('vi-VN')} đ
                              </span>
                            </td>

                            {/* Trạng thái Bật/Tắt nhanh 1 click */}
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  const nextStatus: MenuStatus = isAvailable ? 'out_of_stock' : 'available';
                                  toggleMenuItemStatus(dish.id, nextStatus);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 12px',
                                  borderRadius: 'var(--radius-full)',
                                  border: isAvailable ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                  backgroundColor: isAvailable ? '#f0fdf4' : '#fef2f2',
                                  color: isAvailable ? '#15803d' : '#b91c1c',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  transition: 'all 0.15s ease',
                                }}
                                title={isAvailable ? 'Click để Báo Hết Món' : 'Click để Mở Bán Lại'}
                              >
                                {isAvailable ? (
                                  <>
                                    <ToggleRight size={18} color="#16a34a" />
                                    <span>Đang bán</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft size={18} color="#dc2626" />
                                    <span>Tạm hết</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* Thao tác */}
                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary btn-sm btn-icon"
                                  title="Chỉnh sửa món"
                                  onClick={() => handleOpenEditDish(dish)}
                                  style={{ width: '32px', height: '32px', padding: 0 }}
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm btn-icon"
                                  title="Xóa món khỏi thực đơn"
                                  style={{ width: '32px', height: '32px', padding: 0, color: 'var(--danger)' }}
                                  onClick={() => handleDeleteDish(dish.id, dish.name)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────
              VIEW MODE 2: COMPACT GRID (LƯỚI THẺ GỌN)
             ────────────────────────────────────────── */}
          {viewMode === 'GRID' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {filteredDishes.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  Không tìm thấy món ăn nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const isAvailable = dish.status === 'available';
                  const periodBadge = formatMealPeriodBadge(dish.meal_periods);
                  return (
                    <div
                      key={dish.id}
                      className="card"
                      style={{
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'stretch',
                        borderRadius: 'var(--radius-lg)',
                        border: isAvailable ? '1px solid var(--border-color)' : '1px solid #fecaca',
                        backgroundColor: isAvailable ? 'var(--bg-surface)' : '#fffafa',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{ position: 'relative', width: '92px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                        <img
                          src={getOptimizedImageUrl(dish.image, { width: 200, height: 200 })}
                          alt={dish.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: isAvailable ? 1 : 0.6,
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/images/food-placeholder.svg';
                          }}
                        />
                        {dish.is_best_seller && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              backgroundColor: '#f59e0b',
                              color: '#fff',
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Star size={9} fill="#fff" /> HOT
                          </span>
                        )}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {dish.code}
                        </span>
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                              {dish.category}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: periodBadge.color, backgroundColor: periodBadge.bg, padding: '1px 6px', borderRadius: '4px' }}>
                              {periodBadge.label}
                            </span>
                          </div>
                          <h4
                            style={{
                              margin: '0 0 4px',
                              fontSize: '0.92rem',
                              fontWeight: 800,
                              color: isAvailable ? 'var(--text-main)' : 'var(--text-muted)',
                              textDecoration: isAvailable ? 'none' : 'line-through',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={dish.name}
                          >
                            {dish.name}
                          </h4>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {(dish.base_price || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* Quick Actions Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                          <button
                            onClick={() => {
                              const nextStatus: MenuStatus = isAvailable ? 'out_of_stock' : 'available';
                              toggleMenuItemStatus(dish.id, nextStatus);
                            }}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: isAvailable ? '#15803d' : '#dc2626',
                            }}
                          >
                            {isAvailable ? <ToggleRight size={18} color="#16a34a" /> : <ToggleLeft size={18} color="#dc2626" />}
                            <span>{isAvailable ? 'Đang bán' : 'Tạm hết'}</span>
                          </button>

                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              style={{ width: '28px', height: '28px', padding: 0 }}
                              title="Chỉnh sửa món"
                              onClick={() => handleOpenEditDish(dish)}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              style={{ width: '28px', height: '28px', padding: 0, color: 'var(--danger)' }}
                              title="Xóa món"
                              onClick={() => handleDeleteDish(dish.id, dish.name)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: KÍCH CỠ & TOPPING (OPTIONS)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'OPTIONS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filters Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div className="search-bar" style={{ width: '340px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm tên tùy chọn (Tô Lớn, Quẩy, Trân châu...)..."
                  value={optionSearch}
                  onChange={(e) => setOptionSearch(e.target.value)}
                />
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn btn-sm ${optionTypeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOptionTypeFilter('ALL')}
                >
                  Tất Cả Loại
                </button>
                <button
                  className={`btn btn-sm ${optionTypeFilter === 'size' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOptionTypeFilter('size')}
                >
                  Kích Cỡ (Chọn 1)
                </button>
                <button
                  className={`btn btn-sm ${optionTypeFilter === 'topping' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOptionTypeFilter('topping')}
                >
                  Topping / Món Thêm (Chọn Nhiều)
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                className={`btn btn-sm ${optionCategoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOptionCategoryFilter('ALL')}
              >
                Tất Cả Kiểu Món ({category_options.length})
              </button>
              {DISH_CATEGORIES.map((cat) => {
                const count = category_options.filter((o) => o.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    className={`btn btn-sm ${optionCategoryFilter === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setOptionCategoryFilter(cat.id)}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    TÊN TÙY CHỌN
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    PHÂN LOẠI
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    ÁP DỤNG CHO NHÓM MÓN
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    GIÁ CỘNG THÊM
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    TRẠNG THÁI
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>
                    THAO TÁC
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Không có tùy chọn kích cỡ hay topping nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredOptions.map((opt) => {
                    const catObj = DISH_CATEGORIES.find((c) => c.id === opt.category_id);
                    const isAvailable = opt.status?.toLowerCase() === 'available';
                    return (
                      <tr key={opt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '16px 20px' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{opt.name}</strong>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: opt.option_type === 'size' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(232, 93, 38, 0.12)',
                              color: opt.option_type === 'size' ? '#2563eb' : 'var(--primary)',
                            }}
                          >
                            {opt.option_type === 'size' ? 'Kích Cỡ (Size)' : 'Topping Thêm'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {catObj ? catObj.name : opt.category_id}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: opt.price > 0 ? 'var(--primary)' : 'var(--success)' }}>
                            {opt.price > 0 ? `+${opt.price.toLocaleString('vi-VN')} đ` : 'Miễn Phí (0 đ)'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              color: isAvailable ? 'var(--success)' : 'var(--text-muted)',
                            }}
                          >
                            {isAvailable ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {isAvailable ? 'Sẵn sàng phục vụ' : 'Tạm ngưng phục vụ'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                const nextStatus = isAvailable ? 'unavailable' : 'available';
                                toggleCategoryOptionStatus(opt.id, nextStatus);
                              }}
                            >
                              {isAvailable ? 'Báo Hết' : 'Mở Lại'}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              title="Sửa tùy chọn"
                              onClick={() => handleOpenEditOption(opt)}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              title="Xóa tùy chọn"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteOption(opt.id, opt.name)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THÊM MÓN ĂN MỚI
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddDishModalOpen} onClose={() => setIsAddDishModalOpen(false)} title="Thêm Món Mới Vào Master Menu">
        <form onSubmit={handleSubmitNewDish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Mã Món (SKU)*</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: PHO-05, COM-03"
                required
                value={dishFormData.code}
                onChange={(e) => setDishFormData({ ...dishFormData, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Danh Mục Kiểu Món*</label>
              <select
                className="form-select"
                value={dishFormData.category}
                onChange={(e) => setDishFormData({ ...dishFormData, category: e.target.value as MenuCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tên Món Ăn*</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Phở Bò Sườn Cây Đặc Biệt"
                required
                value={dishFormData.name}
                onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Giá Chuẩn Master (VNĐ)*</label>
              <input
                type="number"
                className="form-input"
                step={1000}
                required
                value={dishFormData.base_price}
                onChange={(e) => setDishFormData({ ...dishFormData, base_price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Khung Giờ / Ca Bán Phục Vụ*</label>
            <select
              className="form-select"
              value={dishFormData.meal_periods}
              onChange={(e) => setDishFormData({ ...dishFormData, meal_periods: e.target.value })}
            >
              {MEAL_PERIOD_OPTIONS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mô Tả Hương Vị & Nét Đặc Trưng</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Mô tả công thức chế biến đặc trưng..."
              value={dishFormData.description}
              onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nguyên Liệu Nổi Bật (Phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Thịt sườn bò, Nước hầm 24h, Hành tây, Quế hồi..."
              value={dishFormData.ingredients}
              onChange={(e) => setDishFormData({ ...dishFormData, ingredients: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Hình Ảnh Món Ăn</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ Cloudinary & Local</span>
            </label>
            
            <input
              type="file"
              ref={fileInputAddRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadImageFile}
            />

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              <img
                src={dishFormData.image}
                alt="Preview"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#0f172a',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/images/food-placeholder.svg';
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputAddRef.current?.click()}
                disabled={isUploadingImg}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingImg ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                <span>{isUploadingImg ? 'Đang tải lên Cloud...' : 'Tải Ảnh Lên Cloud'}</span>
              </button>
            </div>

            <input
              type="url"
              className="form-input"
              placeholder="Hoặc dán URL hình ảnh trực tiếp..."
              value={dishFormData.image}
              onChange={(e) => setDishFormData({ ...dishFormData, image: e.target.value })}
            />
            {uploadError && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                {uploadError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <input
              type="checkbox"
              id="newDishBestSeller"
              checked={dishFormData.is_best_seller}
              onChange={(e) => setDishFormData({ ...dishFormData, is_best_seller: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="newDishBestSeller" style={{ fontSize: '0.925rem', fontWeight: 700, cursor: 'pointer' }}>
              Đánh dấu là Món Bán Chạy (Best Seller)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddDishModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Món Mới
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CHỈNH SỬA MÓN ĂN
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editingDish} onClose={() => setEditingDish(null)} title="Chỉnh Sửa Thông Tin Món Ăn">
        <form onSubmit={handleSubmitEditDish}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Mã Món (SKU)*</label>
              <input
                type="text"
                className="form-input"
                required
                value={dishFormData.code}
                onChange={(e) => setDishFormData({ ...dishFormData, code: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Danh Mục Kiểu Món*</label>
              <select
                className="form-select"
                value={dishFormData.category}
                onChange={(e) => setDishFormData({ ...dishFormData, category: e.target.value as MenuCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tên Món Ăn*</label>
              <input
                type="text"
                className="form-input"
                required
                value={dishFormData.name}
                onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Giá Chuẩn Master (VNĐ)*</label>
              <input
                type="number"
                className="form-input"
                step={1000}
                required
                value={dishFormData.base_price}
                onChange={(e) => setDishFormData({ ...dishFormData, base_price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Khung Giờ / Ca Bán Phục Vụ*</label>
            <select
              className="form-select"
              value={dishFormData.meal_periods}
              onChange={(e) => setDishFormData({ ...dishFormData, meal_periods: e.target.value })}
            >
              {MEAL_PERIOD_OPTIONS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mô Tả Hương Vị & Nét Đặc Trưng</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={dishFormData.description}
              onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nguyên Liệu Nổi Bật (Phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              className="form-input"
              value={dishFormData.ingredients}
              onChange={(e) => setDishFormData({ ...dishFormData, ingredients: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Hình Ảnh Món Ăn</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ Cloudinary & Local</span>
            </label>

            <input
              type="file"
              ref={fileInputEditRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadImageFile}
            />

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              <img
                src={dishFormData.image}
                alt="Preview"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#0f172a',
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/images/food-placeholder.svg';
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputEditRef.current?.click()}
                disabled={isUploadingImg}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isUploadingImg ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                <span>{isUploadingImg ? 'Đang tải lên Cloud...' : 'Tải Ảnh Lên Cloud'}</span>
              </button>
            </div>

            <input
              type="url"
              className="form-input"
              placeholder="Hoặc dán URL hình ảnh trực tiếp..."
              value={dishFormData.image}
              onChange={(e) => setDishFormData({ ...dishFormData, image: e.target.value })}
            />
            {uploadError && (
              <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                {uploadError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
            <input
              type="checkbox"
              id="editDishBestSeller"
              checked={dishFormData.is_best_seller}
              onChange={(e) => setDishFormData({ ...dishFormData, is_best_seller: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="editDishBestSeller" style={{ fontSize: '0.925rem', fontWeight: 700, cursor: 'pointer' }}>
              Đánh dấu là Món Bán Chạy (Best Seller)
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingDish(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Cập Nhật Món
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THÊM TÙY CHỌN (OPTION: SIZE / TOPPING)
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddOptionModalOpen} onClose={() => setIsAddOptionModalOpen(false)} title="Thêm Kích Cỡ hoặc Topping Mới">
        <form onSubmit={handleSubmitNewOption}>
          <div className="form-group">
            <label className="form-label">Áp Dụng Cho Nhóm Món*</label>
            <select
              className="form-select"
              value={optionFormData.category_id}
              onChange={(e) => setOptionFormData({ ...optionFormData, category_id: e.target.value })}
            >
              {DISH_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Loại Tùy Chọn*</label>
              <select
                className="form-select"
                value={optionFormData.option_type}
                onChange={(e) => setOptionFormData({ ...optionFormData, option_type: e.target.value as 'size' | 'topping' })}
              >
                <option value="size">Kích Cỡ / Size (Khách chọn 1)</option>
                <option value="topping">Topping / Món Thêm (Khách chọn nhiều)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá Cộng Thêm (VNĐ)*</label>
              <input
                type="number"
                className="form-input"
                step={1000}
                required
                value={optionFormData.price}
                onChange={(e) => setOptionFormData({ ...optionFormData, price: Number(e.target.value) })}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>0 đ = Miễn phí / Size tiêu chuẩn</small>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tên Kích Cỡ / Topping*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Tô Lớn, Quẩy Giòn, Thêm Thịt Bò Tái..."
              required
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOptionModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo Tùy Chọn
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: SỬA TÙY CHỌN (OPTION)
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editingOption} onClose={() => setEditingOption(null)} title="Chỉnh Sửa Kích Cỡ / Topping">
        <form onSubmit={handleSubmitEditOption}>
          <div className="form-group">
            <label className="form-label">Áp Dụng Cho Nhóm Món*</label>
            <select
              className="form-select"
              value={optionFormData.category_id}
              onChange={(e) => setOptionFormData({ ...optionFormData, category_id: e.target.value })}
            >
              {DISH_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Loại Tùy Chọn*</label>
              <select
                className="form-select"
                value={optionFormData.option_type}
                onChange={(e) => setOptionFormData({ ...optionFormData, option_type: e.target.value as 'size' | 'topping' })}
              >
                <option value="size">Kích Cỡ / Size (Khách chọn 1)</option>
                <option value="topping">Topping / Món Thêm (Khách chọn nhiều)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá Cộng Thêm (VNĐ)*</label>
              <input
                type="number"
                className="form-input"
                step={1000}
                required
                value={optionFormData.price}
                onChange={(e) => setOptionFormData({ ...optionFormData, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tên Kích Cỡ / Topping*</label>
            <input
              type="text"
              className="form-input"
              required
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Trạng Thái Phục Vụ*</label>
            <select
              className="form-select"
              value={optionFormData.status}
              onChange={(e) => setOptionFormData({ ...optionFormData, status: e.target.value })}
            >
              <option value="AVAILABLE">Sẵn Sàng Phục Vụ (AVAILABLE)</option>
              <option value="UNAVAILABLE">Tạm Hết Hàng (UNAVAILABLE)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingOption(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Cập Nhật
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
