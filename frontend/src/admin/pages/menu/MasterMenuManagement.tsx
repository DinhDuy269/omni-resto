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
  X,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAdminStore, DISH_CATEGORIES } from '../../store/adminStore';
import { Modal } from '../../../shared/components/Modal';
import { uploadApi } from '../../../shared/api/uploadApi';
import { getOptimizedImageUrl } from '../../../shared/utils/cloudinaryUtils';
import type { MenuCategory, MenuStatus, MenuItem, CategoryOption } from '../../../shared/types/admin';
import './MasterMenuManagement.css';

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
  { value: 'ALL_DAY', label: 'Cả Ngày (Toàn Thời Gian / 06h - 22h)' },
  { value: 'MORNING', label: 'Điểm Tâm Sáng (06:00 - 10:30)' },
  { value: 'NOON', label: 'Cơm Trưa (10:30 - 14:30)' },
  { value: 'EVENING', label: 'Bữa Tối & Lẩu (16:30 - 22:00)' },
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

  // View Mode for Dishes: 'TABLE' or 'GRID' (Default: TABLE)
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

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)}MB) vượt quá giới hạn 5MB!`);
      e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Định dạng file không hợp lệ! Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.');
      e.target.value = '';
      return;
    }

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

  // Metrics
  const totalDishes = menu_items.length;
  const availableDishes = menu_items.filter((m) => m.status === 'available').length;
  const outOfStockDishes = menu_items.filter((m) => m.status === 'out_of_stock').length;
  const bestSellerDishes = menu_items.filter((m) => m.is_best_seller).length;

  return (
    <div className="menu-admin-container animate-fade-in">
      {/* ── TOP HEADER ── */}
      <div className="menu-header-row">
        <div>
          <div className="menu-header-badge-row">
            <span className="menu-badge-category">
              <Utensils size={13} /> QUẢN TRỊ THỰC ĐƠN & BẾP TRUNG TÂM
            </span>
          </div>
          <h1 className="menu-header-title">Quản Lý Thực Đơn Chuỗi (Master Menu)</h1>
          <p className="menu-header-desc">
            Chuẩn hóa danh mục món ăn, tùy chọn kích cỡ, topping và cập nhật trạng thái mở bán tức thì trên toàn chuỗi
          </p>
        </div>

        <div className="menu-header-actions">
          {/* View Switcher Tabs: DISHES vs OPTIONS */}
          <div className="menu-tab-switcher">
            <button
              type="button"
              className={`menu-tab-btn ${activeTab === 'DISHES' ? 'active' : ''}`}
              onClick={() => setActiveTab('DISHES')}
            >
              <Utensils size={16} />
              <span>Danh Mục Món Ăn</span>
              <span className="menu-tab-counter">{menu_items.length}</span>
            </button>
            <button
              type="button"
              className={`menu-tab-btn ${activeTab === 'OPTIONS' ? 'active' : ''}`}
              onClick={() => setActiveTab('OPTIONS')}
            >
              <Layers size={16} />
              <span>Kích Cỡ & Topping</span>
              <span className="menu-tab-counter">{category_options.length}</span>
            </button>
          </div>

          <button
            type="button"
            className="menu-btn-cloud"
            onClick={handleMigrateCloudImages}
            disabled={isMigrating}
            title="Quét và đồng bộ tất cả ảnh món ăn sang Cloudinary"
          >
            {isMigrating ? <Loader2 size={16} className="spinning" /> : <UploadCloud size={16} />}
            <span>{isMigrating ? 'Đang đồng bộ...' : 'Đồng Bộ Ảnh Cloud'}</span>
          </button>

          {activeTab === 'DISHES' ? (
            <button
              type="button"
              className="menu-btn-primary"
              onClick={handleOpenAddDish}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Thêm Món Mới</span>
            </button>
          ) : (
            <button
              type="button"
              className="menu-btn-secondary"
              onClick={handleOpenAddOption}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Thêm Topping / Size</span>
            </button>
          )}
        </div>
      </div>

      {/* Migration Status Toast Banner */}
      {migrationStatus && (
        <div className={`migration-banner ${migrationStatus.includes('thất bại') ? 'error' : 'success'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {migrationStatus.includes('thất bại') ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{migrationStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setMigrationStatus(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: DANH MỤC MÓN ĂN (DISHES)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'DISHES' && (
        <>
          {/* Quick Metrics KPI Counters */}
          <div className="menu-stats-grid">
            <div className="menu-stat-card">
              <div className="menu-stat-header">
                <span className="menu-stat-label">Tổng thực đơn</span>
                <div className="menu-stat-icon icon-orange">
                  <Utensils size={20} />
                </div>
              </div>
              <div className="menu-stat-value">{totalDishes} món</div>
              <div className="menu-stat-footer">
                <span>Toàn bộ danh mục</span>
                <span className="menu-stat-pill pill-neutral">Master Menu</span>
              </div>
            </div>

            <div className="menu-stat-card card-avail">
              <div className="menu-stat-header">
                <span className="menu-stat-label">Đang mở bán</span>
                <div className="menu-stat-icon icon-emerald">
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div className="menu-stat-value">{availableDishes} món</div>
              <div className="menu-stat-footer">
                <span>Sẵn sàng phục vụ</span>
                <span className="menu-stat-pill pill-success">Đang bán</span>
              </div>
            </div>

            <div className="menu-stat-card card-oos">
              <div className="menu-stat-header">
                <span className="menu-stat-label">Tạm hết món</span>
                <div className="menu-stat-icon icon-rose">
                  <XCircle size={20} />
                </div>
              </div>
              <div className="menu-stat-value">{outOfStockDishes} món</div>
              <div className="menu-stat-footer">
                <span>Cần bổ sung kho bếp</span>
                {outOfStockDishes > 0 ? (
                  <span className="menu-stat-pill pill-danger">Tạm hết</span>
                ) : (
                  <span className="menu-stat-pill pill-success">Đầy đủ</span>
                )}
              </div>
            </div>

            <div className="menu-stat-card card-best">
              <div className="menu-stat-header">
                <span className="menu-stat-label">Món bán chạy</span>
                <div className="menu-stat-icon icon-amber">
                  <Star size={20} fill="#d97706" />
                </div>
              </div>
              <div className="menu-stat-value">{bestSellerDishes} món</div>
              <div className="menu-stat-footer">
                <span>Được gắn huy hiệu Best Seller</span>
                <span className="menu-stat-pill pill-warning">Bán chạy</span>
              </div>
            </div>
          </div>

          {/* Search, Filter Toolbar & View Mode Switcher */}
          <div className="menu-filter-card">
            <div className="menu-filter-main-row">
              {/* Search input */}
              <div className="menu-search-box">
                <Search size={18} className="menu-search-icon" />
                <input
                  type="text"
                  className="menu-search-input"
                  placeholder="Tìm theo tên món, mã SKU, nguyên liệu..."
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                />
                {dishSearch && (
                  <button
                    type="button"
                    onClick={() => setDishSearch('')}
                    className="menu-search-clear"
                    title="Xóa tìm kiếm"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Multi-Filters: Ca bán & Trạng thái */}
              <div className="menu-dropdowns-group">
                <select
                  value={dishMealPeriodFilter}
                  onChange={(e) => setDishMealPeriodFilter(e.target.value)}
                  className="menu-select-filter"
                  title="Lọc theo khung giờ / ca phục vụ"
                >
                  <option value="ALL">🕒 Tất Cả Khung Giờ</option>
                  <option value="ALL_DAY">☕ Cả Ngày (06h - 22h)</option>
                  <option value="MORNING">☀️ Điểm Tâm Sáng (06h - 10h30)</option>
                  <option value="NOON">🍚 Bữa Trưa (10h30 - 14h30)</option>
                  <option value="EVENING">🍲 Bữa Tối & Lẩu (16h30 - 22h)</option>
                </select>

                <select
                  value={dishStatusFilter}
                  onChange={(e) => setDishStatusFilter(e.target.value)}
                  className="menu-select-filter"
                  title="Lọc theo trạng thái món"
                >
                  <option value="ALL">⚡ Tất Cả Trạng Thái</option>
                  <option value="available">🟢 Đang Mở Bán</option>
                  <option value="out_of_stock">🔴 Tạm Hết Món</option>
                </select>

                {(dishSearch || dishMealPeriodFilter !== 'ALL' || dishStatusFilter !== 'ALL' || activeCategory !== 'ALL') && (
                  <button
                    type="button"
                    className="menu-btn-reset"
                    onClick={() => {
                      setDishSearch('');
                      setDishMealPeriodFilter('ALL');
                      setDishStatusFilter('ALL');
                      setActiveCategory('ALL');
                    }}
                    title="Đặt lại tất cả bộ lọc"
                  >
                    <RotateCcw size={14} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>

              {/* View Mode Switcher: TABLE vs GRID */}
              <div className="menu-view-mode-toggle">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'TABLE' ? 'active' : ''}`}
                  onClick={() => setViewMode('TABLE')}
                  title="Xem dạng Bảng dữ liệu (Mật độ thông tin cao)"
                >
                  <List size={16} />
                  <span>Bảng</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'GRID' ? 'active' : ''}`}
                  onClick={() => setViewMode('GRID')}
                  title="Xem dạng Lưới thẻ gọn"
                >
                  <LayoutGrid size={16} />
                  <span>Thẻ gọn</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills Ribbon */}
            <div className="menu-categories-ribbon">
              <button
                type="button"
                className={`category-chip-btn ${activeCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveCategory('ALL')}
              >
                <span>Tất Cả Danh Mục</span>
                <span className="category-chip-count">{menu_items.length}</span>
              </button>
              {CATEGORIES.map((cat) => {
                const count = menu_items.filter((m) => m.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip-btn ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <span>{cat}</span>
                    <span className="category-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="menu-results-summary">
            <span>
              Tìm thấy <strong>{filteredDishes.length}</strong> / {menu_items.length} món ăn
              {activeCategory !== 'ALL' && ` · Thuộc danh mục "${activeCategory}"`}
              {dishMealPeriodFilter !== 'ALL' && ` · Lọc theo ca`}
              {dishStatusFilter !== 'ALL' && ` · ${dishStatusFilter === 'available' ? 'Đang mở bán' : 'Tạm hết món'}`}
            </span>
            <span className="results-hint">
              * Mẹo: Click trực tiếp vào nút trạng thái để Đổi nhanh Sẵn sàng / Hết món
            </span>
          </div>

          {/* ──────────────────────────────────────────
              VIEW MODE 1: DATA TABLE (BẢNG DANH SÁCH)
             ────────────────────────────────────────── */}
          {viewMode === 'TABLE' && (
            <div className="menu-table-wrapper">
              <div style={{ overflowX: 'auto' }}>
                <table className="menu-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '360px' }}>MÓN ĂN & MÃ SKU</th>
                      <th>DANH MỤC</th>
                      <th>KHUNG GIỜ PHỤC VỤ</th>
                      <th style={{ textAlign: 'right' }}>GIÁ BÁN</th>
                      <th style={{ textAlign: 'center', width: '160px' }}>TRẠNG THÁI</th>
                      <th style={{ textAlign: 'right', width: '110px' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDishes.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                          <AlertCircle size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                          <strong>Không tìm thấy món ăn nào phù hợp với bộ lọc hiện tại.</strong>
                        </td>
                      </tr>
                    ) : (
                      filteredDishes.map((dish) => {
                        const isAvailable = dish.status === 'available';
                        const periodBadge = formatMealPeriodBadge(dish.meal_periods);
                        return (
                          <tr
                            key={dish.id}
                            className={!isAvailable ? 'row-out-of-stock' : ''}
                          >
                            {/* Món ăn & SKU */}
                            <td>
                              <div className="dish-cell-wrap">
                                <div className="dish-thumb-box">
                                  <img
                                    src={getOptimizedImageUrl(dish.image, { width: 104, height: 104 })}
                                    alt={dish.name}
                                    className="dish-thumb-img"
                                    style={{ opacity: isAvailable ? 1 : 0.6 }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = '/images/food-placeholder.svg';
                                    }}
                                  />
                                  {dish.is_best_seller && (
                                    <div className="dish-best-star" title="Món bán chạy (Best Seller)">
                                      <Star size={10} fill="#fff" />
                                    </div>
                                  )}
                                </div>
                                <div className="dish-info-details">
                                  <div className="dish-title-row">
                                    <span className="dish-sku-pill">{dish.code}</span>
                                    <span className={`dish-name-text ${!isAvailable ? 'is-out-of-stock' : ''}`}>
                                      {dish.name}
                                    </span>
                                  </div>
                                  {dish.description && (
                                    <p className="dish-desc-text" title={dish.description}>
                                      {dish.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Danh mục */}
                            <td>
                              <span className="dish-category-badge">{dish.category}</span>
                            </td>

                            {/* Ca phục vụ */}
                            <td>
                              <span
                                className="dish-period-badge"
                                style={{ backgroundColor: periodBadge.bg, color: periodBadge.color }}
                              >
                                <Clock size={12} />
                                <span>{periodBadge.label}</span>
                              </span>
                            </td>

                            {/* Giá bán */}
                            <td style={{ textAlign: 'right' }}>
                              <span className="dish-price-text">
                                {(dish.base_price || 0).toLocaleString('vi-VN')} đ
                              </span>
                            </td>

                            {/* Trạng thái Bật/Tắt nhanh 1 click */}
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStatus: MenuStatus = isAvailable ? 'out_of_stock' : 'available';
                                  toggleMenuItemStatus(dish.id, nextStatus);
                                }}
                                className={`dish-status-toggle-btn ${isAvailable ? 'is-available' : 'is-oos'}`}
                                title={isAvailable ? 'Click để Báo Hết Món' : 'Click để Mở Bán Lại'}
                              >
                                {isAvailable ? (
                                  <>
                                    <ToggleRight size={18} color="#059669" />
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
                            <td style={{ textAlign: 'right' }}>
                              <div className="menu-action-btns">
                                <button
                                  type="button"
                                  className="menu-icon-btn"
                                  title="Chỉnh sửa món"
                                  onClick={() => handleOpenEditDish(dish)}
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="menu-icon-btn btn-delete"
                                  title="Xóa món khỏi thực đơn"
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
            <div className="menu-grid-wrapper">
              {filteredDishes.length === 0 ? (
                <div className="menu-table-wrapper" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  <AlertCircle size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <strong>Không tìm thấy món ăn nào phù hợp với bộ lọc hiện tại.</strong>
                </div>
              ) : (
                filteredDishes.map((dish) => {
                  const isAvailable = dish.status === 'available';
                  const periodBadge = formatMealPeriodBadge(dish.meal_periods);
                  return (
                    <div
                      key={dish.id}
                      className={`menu-grid-card ${!isAvailable ? 'is-oos' : ''}`}
                    >
                      {/* Thumbnail */}
                      <div className="grid-card-thumb">
                        <img
                          src={getOptimizedImageUrl(dish.image, { width: 200, height: 200 })}
                          alt={dish.name}
                          className="grid-card-img"
                          style={{ opacity: isAvailable ? 1 : 0.6 }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/images/food-placeholder.svg';
                          }}
                        />
                        {dish.is_best_seller && (
                          <span className="grid-best-tag">
                            <Star size={9} fill="#fff" /> HOT
                          </span>
                        )}
                        <span className="grid-sku-tag">{dish.code}</span>
                      </div>

                      {/* Details */}
                      <div className="grid-card-content">
                        <div>
                          <div className="grid-tags-row">
                            <span className="dish-category-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                              {dish.category}
                            </span>
                            <span
                              className="dish-period-badge"
                              style={{ fontSize: '0.68rem', padding: '2px 6px', backgroundColor: periodBadge.bg, color: periodBadge.color }}
                            >
                              {periodBadge.label}
                            </span>
                          </div>
                          <h4
                            className={`grid-title-text ${!isAvailable ? 'is-out-of-stock' : ''}`}
                            title={dish.name}
                          >
                            {dish.name}
                          </h4>
                          <span className="grid-price-text">
                            {(dish.base_price || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* Quick Actions Row */}
                        <div className="grid-footer-row">
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus: MenuStatus = isAvailable ? 'out_of_stock' : 'available';
                              toggleMenuItemStatus(dish.id, nextStatus);
                            }}
                            className={`dish-status-toggle-btn ${isAvailable ? 'is-available' : 'is-oos'}`}
                            style={{ padding: '4px 10px', fontSize: '0.725rem' }}
                          >
                            {isAvailable ? <ToggleRight size={16} color="#059669" /> : <ToggleLeft size={16} color="#dc2626" />}
                            <span>{isAvailable ? 'Đang bán' : 'Tạm hết'}</span>
                          </button>

                          <div className="menu-action-btns">
                            <button
                              type="button"
                              className="menu-icon-btn"
                              style={{ width: '30px', height: '30px' }}
                              title="Chỉnh sửa món"
                              onClick={() => handleOpenEditDish(dish)}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="menu-icon-btn btn-delete"
                              style={{ width: '30px', height: '30px' }}
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: KÍCH CỠ & TOPPING (OPTIONS)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'OPTIONS' && (
        <>
          {/* Filters Card */}
          <div className="menu-filter-card">
            <div className="menu-filter-main-row">
              <div className="menu-search-box">
                <Search size={18} className="menu-search-icon" />
                <input
                  type="text"
                  className="menu-search-input"
                  placeholder="Tìm tên tùy chọn (Tô Lớn, Quẩy, Trân châu...)..."
                  value={optionSearch}
                  onChange={(e) => setOptionSearch(e.target.value)}
                />
                {optionSearch && (
                  <button
                    type="button"
                    onClick={() => setOptionSearch('')}
                    className="menu-search-clear"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Type Filter Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`category-chip-btn ${optionTypeFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setOptionTypeFilter('ALL')}
                >
                  Tất Cả Loại
                </button>
                <button
                  type="button"
                  className={`category-chip-btn ${optionTypeFilter === 'size' ? 'active' : ''}`}
                  onClick={() => setOptionTypeFilter('size')}
                >
                  Kích Cỡ (Size)
                </button>
                <button
                  type="button"
                  className={`category-chip-btn ${optionTypeFilter === 'topping' ? 'active' : ''}`}
                  onClick={() => setOptionTypeFilter('topping')}
                >
                  Topping / Món Thêm
                </button>
              </div>
            </div>

            {/* Category Pills Ribbon */}
            <div className="menu-categories-ribbon">
              <button
                type="button"
                className={`category-chip-btn ${optionCategoryFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setOptionCategoryFilter('ALL')}
              >
                <span>Tất Cả Kiểu Món</span>
                <span className="category-chip-count">{category_options.length}</span>
              </button>
              {DISH_CATEGORIES.map((cat) => {
                const count = category_options.filter((o) => o.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-chip-btn ${optionCategoryFilter === cat.id ? 'active' : ''}`}
                    onClick={() => setOptionCategoryFilter(cat.id)}
                  >
                    <span>{cat.name}</span>
                    <span className="category-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Table */}
          <div className="menu-table-wrapper">
            <table className="menu-data-table">
              <thead>
                <tr>
                  <th>TÊN TÙY CHỌN</th>
                  <th>PHÂN LOẠI</th>
                  <th>ÁP DỤNG CHO NHÓM MÓN</th>
                  <th>GIÁ CỘNG THÊM</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <AlertCircle size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <strong>Không có tùy chọn kích cỡ hay topping nào phù hợp.</strong>
                    </td>
                  </tr>
                ) : (
                  filteredOptions.map((opt) => {
                    const catObj = DISH_CATEGORIES.find((c) => c.id === opt.category_id);
                    const isAvailable = opt.status?.toLowerCase() === 'available';
                    return (
                      <tr key={opt.id}>
                        <td>
                          <strong style={{ fontSize: '0.925rem', color: '#0f172a' }}>{opt.name}</strong>
                        </td>
                        <td>
                          <span
                            className="dish-period-badge"
                            style={{
                              backgroundColor: opt.option_type === 'size' ? '#eff6ff' : '#fff7ed',
                              color: opt.option_type === 'size' ? '#2563eb' : '#e85d26',
                              border: opt.option_type === 'size' ? '1px solid #bfdbfe' : '1px solid #fed7aa',
                            }}
                          >
                            {opt.option_type === 'size' ? 'Kích Cỡ (Size)' : 'Topping Thêm'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>
                          {catObj ? catObj.name : opt.category_id}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: opt.price > 0 ? 'var(--menu-primary)' : '#059669' }}>
                            {opt.price > 0 ? `+${opt.price.toLocaleString('vi-VN')} đ` : 'Miễn Phí (0 đ)'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`dish-period-badge ${isAvailable ? 'pill-success' : 'pill-danger'}`}
                            style={{ gap: '6px' }}
                          >
                            {isAvailable ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            <span>{isAvailable ? 'Sẵn sàng phục vụ' : 'Tạm ngưng phục vụ'}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="menu-action-btns">
                            <button
                              type="button"
                              className={`dish-status-toggle-btn ${isAvailable ? 'is-available' : 'is-oos'}`}
                              style={{ padding: '4px 10px', fontSize: '0.725rem' }}
                              onClick={() => {
                                const nextStatus = isAvailable ? 'unavailable' : 'available';
                                toggleCategoryOptionStatus(opt.id, nextStatus);
                              }}
                            >
                              {isAvailable ? 'Báo Hết' : 'Mở Lại'}
                            </button>
                            <button
                              type="button"
                              className="menu-icon-btn"
                              title="Sửa tùy chọn"
                              onClick={() => handleOpenEditOption(opt)}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              className="menu-icon-btn btn-delete"
                              title="Xóa tùy chọn"
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THÊM MÓN ĂN MỚI
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddDishModalOpen} onClose={() => setIsAddDishModalOpen(false)} title="Thêm Món Mới Vào Master Menu">
        <form onSubmit={handleSubmitNewDish} className="modal-form-grid">
          <div className="modal-2col">
            <div className="modal-field">
              <label className="modal-label">Mã Món (SKU)*</label>
              <input
                type="text"
                className="modal-input"
                placeholder="VD: PHO-05, COM-03"
                required
                value={dishFormData.code}
                onChange={(e) => setDishFormData({ ...dishFormData, code: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Danh Mục Kiểu Món*</label>
              <select
                className="modal-select"
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

          <div className="modal-3col">
            <div className="modal-field">
              <label className="modal-label">Tên Món Ăn*</label>
              <input
                type="text"
                className="modal-input"
                placeholder="VD: Phở Bò Sườn Cây Đặc Biệt"
                required
                value={dishFormData.name}
                onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Giá Chuẩn Master (VNĐ)*</label>
              <input
                type="number"
                className="modal-input"
                step={1000}
                required
                value={dishFormData.base_price}
                onChange={(e) => setDishFormData({ ...dishFormData, base_price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Khung Giờ / Ca Bán Phục Vụ*</label>
            <select
              className="modal-select"
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

          <div className="modal-field">
            <label className="modal-label">Mô Tả Hương Vị & Nét Đặc Trưng</label>
            <textarea
              className="modal-textarea"
              rows={2}
              placeholder="Mô tả công thức chế biến đặc trưng..."
              value={dishFormData.description}
              onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Nguyên Liệu Nổi Bật (Phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              className="modal-input"
              placeholder="VD: Thịt sườn bò, Nước hầm 24h, Hành tây, Quế hồi..."
              value={dishFormData.ingredients}
              onChange={(e) => setDishFormData({ ...dishFormData, ingredients: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">
              <span>Hình Ảnh Món Ăn</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hỗ trợ Cloudinary & Local</span>
            </label>

            <input
              type="file"
              ref={fileInputAddRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadImageFile}
            />

            <div className="img-upload-box">
              <img
                src={dishFormData.image}
                alt="Preview"
                className="img-preview-thumb"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/images/food-placeholder.svg';
                }}
              />
              <button
                type="button"
                className="menu-btn-cloud"
                onClick={() => fileInputAddRef.current?.click()}
                disabled={isUploadingImg}
              >
                {isUploadingImg ? <Loader2 size={15} className="spinning" /> : <UploadCloud size={15} />}
                <span>{isUploadingImg ? 'Đang tải lên Cloud...' : 'Tải Ảnh Lên Cloud'}</span>
              </button>
            </div>

            <input
              type="url"
              className="modal-input"
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

          <div className="modal-checkbox-row">
            <input
              type="checkbox"
              id="newDishBestSeller"
              checked={dishFormData.is_best_seller}
              onChange={(e) => setDishFormData({ ...dishFormData, is_best_seller: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#e85d26', cursor: 'pointer' }}
            />
            <label htmlFor="newDishBestSeller" style={{ fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
              ⭐ Đánh dấu là Món Bán Chạy (Best Seller)
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddDishModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="menu-btn-primary">
              <Check size={16} /> Lưu Món Mới
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CHỈNH SỬA MÓN ĂN
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editingDish} onClose={() => setEditingDish(null)} title="Chỉnh Sửa Thông Tin Món Ăn">
        <form onSubmit={handleSubmitEditDish} className="modal-form-grid">
          <div className="modal-2col">
            <div className="modal-field">
              <label className="modal-label">Mã Món (SKU)*</label>
              <input
                type="text"
                className="modal-input"
                required
                value={dishFormData.code}
                onChange={(e) => setDishFormData({ ...dishFormData, code: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Danh Mục Kiểu Món*</label>
              <select
                className="modal-select"
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

          <div className="modal-3col">
            <div className="modal-field">
              <label className="modal-label">Tên Món Ăn*</label>
              <input
                type="text"
                className="modal-input"
                required
                value={dishFormData.name}
                onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Giá Chuẩn Master (VNĐ)*</label>
              <input
                type="number"
                className="modal-input"
                step={1000}
                required
                value={dishFormData.base_price}
                onChange={(e) => setDishFormData({ ...dishFormData, base_price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Khung Giờ / Ca Bán Phục Vụ*</label>
            <select
              className="modal-select"
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

          <div className="modal-field">
            <label className="modal-label">Mô Tả Hương Vị & Nét Đặc Trưng</label>
            <textarea
              className="modal-textarea"
              rows={2}
              value={dishFormData.description}
              onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Nguyên Liệu Nổi Bật (Phân cách bằng dấu phẩy)</label>
            <input
              type="text"
              className="modal-input"
              value={dishFormData.ingredients}
              onChange={(e) => setDishFormData({ ...dishFormData, ingredients: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">
              <span>Hình Ảnh Món Ăn</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hỗ trợ Cloudinary & Local</span>
            </label>

            <input
              type="file"
              ref={fileInputEditRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUploadImageFile}
            />

            <div className="img-upload-box">
              <img
                src={dishFormData.image}
                alt="Preview"
                className="img-preview-thumb"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/images/food-placeholder.svg';
                }}
              />
              <button
                type="button"
                className="menu-btn-cloud"
                onClick={() => fileInputEditRef.current?.click()}
                disabled={isUploadingImg}
              >
                {isUploadingImg ? <Loader2 size={15} className="spinning" /> : <UploadCloud size={15} />}
                <span>{isUploadingImg ? 'Đang tải lên Cloud...' : 'Tải Ảnh Lên Cloud'}</span>
              </button>
            </div>

            <input
              type="url"
              className="modal-input"
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

          <div className="modal-checkbox-row">
            <input
              type="checkbox"
              id="editDishBestSeller"
              checked={dishFormData.is_best_seller}
              onChange={(e) => setDishFormData({ ...dishFormData, is_best_seller: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#e85d26', cursor: 'pointer' }}
            />
            <label htmlFor="editDishBestSeller" style={{ fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', color: '#334155' }}>
              ⭐ Đánh dấu là Món Bán Chạy (Best Seller)
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingDish(null)}>
              Hủy
            </button>
            <button type="submit" className="menu-btn-primary">
              <Check size={16} /> Cập Nhật Món
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THÊM TÙY CHỌN (OPTION: SIZE / TOPPING)
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={isAddOptionModalOpen} onClose={() => setIsAddOptionModalOpen(false)} title="Thêm Kích Cỡ hoặc Topping Mới">
        <form onSubmit={handleSubmitNewOption} className="modal-form-grid">
          <div className="modal-field">
            <label className="modal-label">Áp Dụng Cho Nhóm Món*</label>
            <select
              className="modal-select"
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

          <div className="modal-2col">
            <div className="modal-field">
              <label className="modal-label">Loại Tùy Chọn*</label>
              <select
                className="modal-select"
                value={optionFormData.option_type}
                onChange={(e) => setOptionFormData({ ...optionFormData, option_type: e.target.value as 'size' | 'topping' })}
              >
                <option value="size">Kích Cỡ / Size (Khách chọn 1)</option>
                <option value="topping">Topping / Món Thêm (Khách chọn nhiều)</option>
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Giá Cộng Thêm (VNĐ)*</label>
              <input
                type="number"
                className="modal-input"
                step={1000}
                required
                value={optionFormData.price}
                onChange={(e) => setOptionFormData({ ...optionFormData, price: Number(e.target.value) })}
              />
              <small style={{ color: '#64748b', fontSize: '0.78rem' }}>0 đ = Miễn phí / Size tiêu chuẩn</small>
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Tên Kích Cỡ / Topping*</label>
            <input
              type="text"
              className="modal-input"
              placeholder="VD: Tô Lớn, Quẩy Giòn, Thêm Thịt Bò Tái..."
              required
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOptionModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="menu-btn-primary">
              <Check size={16} /> Tạo Tùy Chọn
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: SỬA TÙY CHỌN (OPTION)
         ───────────────────────────────────────────────────────────── */}
      <Modal isOpen={!!editingOption} onClose={() => setEditingOption(null)} title="Chỉnh Sửa Kích Cỡ / Topping">
        <form onSubmit={handleSubmitEditOption} className="modal-form-grid">
          <div className="modal-field">
            <label className="modal-label">Áp Dụng Cho Nhóm Món*</label>
            <select
              className="modal-select"
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

          <div className="modal-2col">
            <div className="modal-field">
              <label className="modal-label">Loại Tùy Chọn*</label>
              <select
                className="modal-select"
                value={optionFormData.option_type}
                onChange={(e) => setOptionFormData({ ...optionFormData, option_type: e.target.value as 'size' | 'topping' })}
              >
                <option value="size">Kích Cỡ / Size (Khách chọn 1)</option>
                <option value="topping">Topping / Món Thêm (Khách chọn nhiều)</option>
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Giá Cộng Thêm (VNĐ)*</label>
              <input
                type="number"
                className="modal-input"
                step={1000}
                required
                value={optionFormData.price}
                onChange={(e) => setOptionFormData({ ...optionFormData, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-field">
            <label className="modal-label">Tên Kích Cỡ / Topping*</label>
            <input
              type="text"
              className="modal-input"
              required
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Trạng Thái Phục Vụ*</label>
            <select
              className="modal-select"
              value={optionFormData.status}
              onChange={(e) => setOptionFormData({ ...optionFormData, status: e.target.value })}
            >
              <option value="AVAILABLE">Sẵn Sàng Phục Vụ (AVAILABLE)</option>
              <option value="UNAVAILABLE">Tạm Hết Hàng (UNAVAILABLE)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingOption(null)}>
              Hủy
            </button>
            <button type="submit" className="menu-btn-primary">
              <Check size={16} /> Cập Nhật
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
