import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Clock, Sun, Sunset, Coffee, AlertTriangle, MoonIcon } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../../store/clientStore';
import { MenuCard } from '../../components/MenuCard';
import { menuApi } from '../../../admin/pages/menu/menuApi';
import type { MenuItem } from '../../../shared/types/menu';
import { checkIsItemAvailableNow as checkAvailableShared } from '../../utils/mealPeriodUtils';
import { matchesMultiFieldSearch } from '../../../shared/utils/stringUtils';
import './ClientMenu.css';

const ALL_CATEGORY = 'Tất cả';

interface MealPeriodTab {
  id: string;
  label: string;
  timeRange: string;
  icon: React.ReactNode;
}

const MEAL_PERIOD_TABS: MealPeriodTab[] = [
  { id: 'ALL', label: 'Tất cả các buổi', timeRange: '06:00 - 22:00', icon: <Clock size={16} /> },
  { id: 'MORNING', label: 'Sáng (Điểm tâm)', timeRange: '06:00 - 10:30', icon: <Sun size={16} color="#f59e0b" /> },
  { id: 'NOON', label: 'Trưa (Cơm & Bún)', timeRange: '10:30 - 14:30', icon: <Sun size={16} color="#ea580c" /> },
  { id: 'EVENING', label: 'Tối (Lẩu & Nhắm)', timeRange: '16:30 - 22:00', icon: <Sunset size={16} color="#8b5cf6" /> },
  { id: 'ALL_DAY', label: 'Đồ uống cả ngày', timeRange: '06:00 - 22:00', icon: <Coffee size={16} color="#0d9488" /> },
];

/**
 * Tính toán buổi hiện tại dựa trên giờ hệ thống
 */
const getCurrentPeriodClient = (): string => {
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  if (currentMin >= 6 * 60 && currentMin < 10 * 60 + 30) return 'MORNING';
  if (currentMin >= 10 * 60 + 30 && currentMin < 14 * 60 + 30) return 'NOON';
  if (currentMin >= 14 * 60 + 30 && currentMin < 16 * 60 + 30) return 'BREAK';
  if (currentMin >= 16 * 60 + 30 && currentMin < 22 * 60) return 'EVENING';
  return 'CLOSED';
};

/**
 * ClientMenu — Browsing + ordering interface phân theo Buổi ăn
 */
export const ClientMenu: React.FC = () => {
  const { menu_items, setMenuItems } = useAdminStore();
  const { openCart } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  const [currentPeriod, setCurrentPeriod] = useState<string>(getCurrentPeriodClient());
  const [activePeriod,  setActivePeriod]  = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Theo dõi cuộn trang để co gọn đảo nổi khi người dùng cuộn sâu
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Debounce tìm kiếm 220ms để tối ưu hóa hiệu năng render
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  // Build category list
  const categories: string[] = useMemo(() => {
    const cats = Array.from(new Set(menu_items.map((m) => m.category))).filter(Boolean) as string[];
    return [ALL_CATEGORY, ...cats];
  }, [menu_items]);

  // Refs hỗ trợ giải quyết Scroll Desync và thanh cuộn ngang danh mục
  const menuGridRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Khắc phục triệt để lỗi Scroll Desync: Tự động cuộn mượt về đầu danh sách món
  const scrollToGridTop = () => {
    if (menuGridRef.current) {
      const stickyOffset = 175; // 72px client-header + ~95px unified island + buffer
      const elementY = menuGridRef.current.getBoundingClientRect().top + window.pageYOffset - stickyOffset;
      if (window.pageYOffset > elementY) {
        window.scrollTo({ top: elementY, behavior: 'smooth' });
      }
    }
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    scrollToGridTop();
  };

  const handlePeriodChange = (periodId: string) => {
    setActivePeriod(periodId);
    scrollToGridTop();
  };

  // Đồng bộ với API backend nếu có
  useEffect(() => {
    menuApi.getMealPeriodInfo()
      .then((info) => {
        if (info && info.current_period) {
          setCurrentPeriod(info.current_period);
        }
      })
      .catch(() => {
        // Fallback local time
        setCurrentPeriod(getCurrentPeriodClient());
      });

    // Cập nhật lại mỗi 60 giây
    const timer = setInterval(() => {
      setCurrentPeriod(getCurrentPeriodClient());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Lấy dữ liệu món ăn mới nhất từ API backend nếu có
  useEffect(() => {
    menuApi.getMenuItems()
      .then((items) => {
        if (items && items.length > 0) {
          setMenuItems(items);
        }
      })
      .catch(() => {
        // Giữ menuItems từ adminStore
      });
  }, []);

  // Kiểm tra một món có đang trong giờ phục vụ thực tế hay không
  const checkIsItemAvailableNow = (item: MenuItem): boolean => {
    return checkAvailableShared(item, currentPeriod as any);
  };

  // Filter + sort items
  const filteredItems = useMemo(() => {
    let items = menu_items.map(item => ({
      ...item,
      is_available_now: checkIsItemAvailableNow(item),
    }));

    // Lọc theo buổi
    if (activePeriod !== 'ALL') {
      items = items.filter((m) => {
        const p = (m.meal_periods || '').toUpperCase();
        if (activePeriod === 'ALL_DAY') {
          return p.includes('ALL_DAY') || p.includes('ALLDAY') || (m.category && (m.category.includes('Đồ Uống') || m.category.includes('Tráng Miệng')));
        }
        return p.includes(activePeriod) || p.includes('ALL_DAY') || p.includes('ALLDAY');
      });
    }

    // Lọc theo danh mục
    if (activeCategory !== ALL_CATEGORY) {
      items = items.filter((m) => m.category === activeCategory);
    }

    // Lọc theo tìm kiếm tiếng Việt thông minh (không dấu + có dấu + đa từ khóa)
    if (debouncedSearchQuery.trim()) {
      items = items.filter((m) =>
        matchesMultiFieldSearch([m.name, m.description, m.category], debouncedSearchQuery)
      );
    }

    // Món bán chạy và món sẵn sàng lên đầu
    return [...items].sort((a, b) => {
      if (a.is_available_now && !b.is_available_now) return -1;
      if (!a.is_available_now && b.is_available_now) return 1;
      return (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0);
    });
  }, [menu_items, activePeriod, activeCategory, debouncedSearchQuery, currentPeriod]);

  const availableCount = filteredItems.filter((m) => m.status === 'available' && m.is_available_now).length;

  // Banner status message
  const getPeriodBanner = () => {
    const periodDescriptions: Record<string, { label: string; text: string; bg: string; color: string; icon: React.ReactNode }> = {
      MORNING: {
        label: 'Ca Sáng (06:00 - 10:30)',
        text: 'Đang mở phục vụ các món điểm tâm: Xôi xéo gà xé, bánh mì chảo, chè thanh mát.',
        bg: '#fffbeb',
        color: '#b45309',
        icon: <Sun size={18} color="#d97706" />
      },
      NOON: {
        label: 'Ca Trưa (10:30 - 14:30)',
        text: 'Đang mở phục vụ Cơm văn phòng nóng sốt, Cơm gà, Cơm tấm sườn & Phở bò, Bún chả.',
        bg: '#fff7ed',
        color: '#c2410c',
        icon: <Sun size={18} color="#ea580c" />
      },
      BREAK: {
        label: 'Giờ Nghỉ Bếp (14:30 - 16:30)',
        text: 'Bếp tạm dừng nấu để chuẩn bị ca Tối. Chỉ nhận đặt Đồ uống & Cà phê. Ca Tối & Lẩu mở lúc 16:30!',
        bg: '#f1f5f9',
        color: '#475569',
        icon: <Coffee size={18} color="#64748b" />
      },
      EVENING: {
        label: 'Ca Tối (16:30 - 22:00)',
        text: 'Đang mở phục vụ Set Lẩu riêu cua bắp bò, Lẩu Thái hải sản Tomyum & Món nhắm.',
        bg: '#f5f3ff',
        color: '#6d28d9',
        icon: <Sunset size={18} color="#7c3aed" />
      },
      CLOSED: {
        label: 'Đóng Cửa (22:00 - 06:00)',
        text: 'Nhà hàng hiện đang nghỉ ngơi. Hệ thống sẽ mở nhận đơn điểm tâm sáng từ 06:00.',
        bg: '#f8fafc',
        color: '#64748b',
        icon: <MoonIcon size={18} color="#475569" />
      }
    };
    return periodDescriptions[currentPeriod] || periodDescriptions.NOON;
  };

  const banner = getPeriodBanner();
  const isViewingOutsidePeriod = activePeriod !== 'ALL' && activePeriod !== 'ALL_DAY' && activePeriod !== currentPeriod;

  return (
    <div className="client-menu-page">

      {/* ── Brand Headline & Live Status ── */}
      <div className="menu-hero-intro">
        <div className="menu-hero-title-group">
          <h1>
            <span>Thực Đơn OmniResto</span>
            <span className="live-pulse-dot" title="Bếp đang mở phục vụ trực tiếp" />
          </h1>
          <p>
            {banner.label} &bull; {banner.text}
          </p>
        </div>
      </div>

      {/* ── UNIFIED FLOATING ISLAND (STAGE & ISLAND CONTAINER) ── */}
      <div className={`menu-floating-island-wrapper ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="menu-floating-island">
          {/* Tier 1: Meal Period Segmented Controls & Search Bar */}
          <div className="island-tier-period">
            <div className="period-segmented-cluster" role="tablist">
              {MEAL_PERIOD_TABS.map((tab) => {
                const isSelected = activePeriod === tab.id;
                const isLive = tab.id === 'ALL_DAY'
                  ? currentPeriod !== 'CLOSED'
                  : currentPeriod === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`meal-period-tab-${tab.id}`}
                    className={`period-pill-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handlePeriodChange(tab.id)}
                    type="button"
                  >
                    {isLive && <span className="live-pulse-dot" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Monocle Search Bar with Vietnamese diacritics support */}
            <div className={`island-search-wrapper ${isSearchFocused ? 'is-focused' : ''}`}>
              <Search
                size={15}
                color={isSearchFocused ? 'var(--c-primary)' : 'var(--c-text-muted)'}
                strokeWidth={2.4}
              />
              <input
                id="menu-search-input"
                type="text"
                className="island-search-input"
                placeholder="Tìm món ngon (vd: pho bo, lau...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="island-search-clear-btn"
                  onClick={handleClearSearch}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tier 2: Category Ribbon with Edge Fade Masking */}
          <div className="island-tier-category">
            <div className="category-ribbon-viewport" ref={categoryScrollRef}>
              {categories.map((cat) => {
                const isActive = cat === activeCategory;
                return (
                  <button
                    key={cat}
                    id={`category-filter-${cat}`}
                    className={`category-ribbon-tab ${isActive ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat)}
                    type="button"
                    aria-pressed={isActive}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Menu Grid + Notice ── */}
      <div ref={menuGridRef} style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Cảnh báo nếu khách đang xem menu buổi khác */}
        {isViewingOutsidePeriod && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fffbeb', border: '1px solid #fde68a',
            padding: '12px 18px', borderRadius: 'var(--c-r-lg)',
            marginBottom: 20, color: '#92400e', fontSize: '0.875rem'
          }}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong>Lưu ý đặt món:</strong> Bạn đang xem thực đơn ngoài khung giờ phục vụ hiện tại. Các món này chỉ có thể tham khảo và chỉ được đặt món khi đúng khung giờ của buổi!
            </div>
          </div>
        )}

        {/* Results summary */}
        {filteredItems.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, marginBottom: 20, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
              Hiển thị <strong style={{ color: 'var(--c-text-main)' }}>{filteredItems.length}</strong> món
              {debouncedSearchQuery.trim() && (
                <>
                  {' '}cho từ khóa <strong style={{ color: 'var(--c-primary)' }}>"{debouncedSearchQuery}"</strong>
                  <button
                    onClick={handleClearSearch}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--c-primary)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      marginLeft: 8,
                      fontWeight: 600,
                    }}
                  >
                    (Bỏ tìm kiếm)
                  </button>
                </>
              )}
              {activePeriod !== 'ALL' && ` · ${MEAL_PERIOD_TABS.find(t => t.id === activePeriod)?.label}`}
              {activeCategory !== ALL_CATEGORY && ` · ${activeCategory}`}
            </span>

            <span style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>
              ✓ {availableCount} món có thể đặt ngay bây giờ
            </span>
          </div>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 16, padding: '64px 24px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '3rem' }}>🍽️</span>
            <div>
              <strong style={{ color: 'var(--c-text-main)', display: 'block', marginBottom: 6 }}>
                {debouncedSearchQuery.trim()
                  ? `Không tìm thấy món ăn phù hợp với "${debouncedSearchQuery}"`
                  : 'Không tìm thấy món ăn phù hợp'}
              </strong>
              <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
                {debouncedSearchQuery.trim()
                  ? 'Thử tìm kiếm với từ khóa khác (ví dụ: pho bo, bun cha, com tam, lau...) hoặc xóa bộ lọc'
                  : 'Thử chọn buổi khác hoặc xóa bộ lọc tìm kiếm'}
              </span>
            </div>
            <button
              className="c-btn c-btn-outline c-btn-sm"
              onClick={() => { handleClearSearch(); setActiveCategory(ALL_CATEGORY); setActivePeriod('ALL'); }}
            >
              Xem tất cả thực đơn
            </button>
          </div>
        )}

        {/* Grid cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {filteredItems.map((item, idx) => (
            <MenuCard
              key={item.id}
              item={item}
              animationDelay={Math.min(idx * 40, 300)}
            />
          ))}
        </div>
      </div>

      {/* ── Floating Cart CTA ── */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 150,
          animation: 'c-fade-up 0.3s var(--c-t-fast) both',
        }}>
          <button
            id="floating-cart-btn"
            onClick={openCart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 26px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
              cursor: 'pointer',
              font: '700 0.9375rem var(--c-font, system-ui)',
              boxShadow: '0 10px 30px -4px rgba(234, 88, 12, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-3px) scale(1.02)';
              el.style.boxShadow = '0 14px 36px -2px rgba(234, 88, 12, 0.65), 0 0 20px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.5)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.65)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0) scale(1)';
              el.style.boxShadow = '0 10px 30px -4px rgba(234, 88, 12, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            }}
            aria-label={`Xem giỏ hàng: ${totalItems} món, ${totalAmount.toLocaleString('vi-VN')}đ`}
          >
            <div style={{
              background: '#ffffff',
              color: '#ea580c',
              borderRadius: '9999px',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78125rem',
              fontWeight: 850,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            }}>
              {totalItems}
            </div>
            <ShoppingCart size={18} strokeWidth={2.4} />
            <span>Xem giỏ hàng · {totalAmount.toLocaleString('vi-VN')}đ</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
