import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingCart, Clock, Sun, Sunset, Moon, Coffee, AlertTriangle } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../../store/clientStore';
import { MenuCard } from '../../components/MenuCard';
import { menuApi } from '../../../admin/pages/menu/menuApi';
import type { MenuItem } from '../../../shared/types/menu';

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
  const { menuItems, setMenuItems } = useAdminStore();
  const { openCart } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  const [currentPeriod, setCurrentPeriod] = useState<string>(getCurrentPeriodClient());
  const [activePeriod,  setActivePeriod]  = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [searchQuery,    setSearchQuery]    = useState('');

  // Đồng bộ với API backend nếu có
  useEffect(() => {
    menuApi.getMealPeriodInfo()
      .then((info) => {
        if (info && info.currentPeriod) {
          setCurrentPeriod(info.currentPeriod);
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
  }, [setMenuItems]);

  // Kiểm tra một món có đang trong giờ phục vụ thực tế hay không
  const checkIsItemAvailableNow = (item: MenuItem): boolean => {
    if (item.isAvailableNow !== undefined) {
      return item.isAvailableNow;
    }
    const p = (item.mealPeriods || '').toUpperCase();
    if (!p || p.includes('ALL_DAY') || p.includes('ALLDAY')) {
      return currentPeriod !== 'CLOSED' && currentPeriod !== 'BREAK';
    }
    if (currentPeriod === 'BREAK' || currentPeriod === 'CLOSED') {
      return false;
    }
    return p.includes(currentPeriod);
  };

  // Build category list
  const categories: string[] = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category))).filter(Boolean) as string[];
    return [ALL_CATEGORY, ...cats];
  }, [menuItems]);

  // Filter + sort items
  const filteredItems = useMemo(() => {
    let items = menuItems.map(item => ({
      ...item,
      isAvailableNow: checkIsItemAvailableNow(item),
    }));

    // Lọc theo buổi
    if (activePeriod !== 'ALL') {
      items = items.filter((m) => {
        const p = (m.mealPeriods || '').toUpperCase();
        if (activePeriod === 'ALL_DAY') {
          return p.includes('ALL_DAY') || m.category.includes('Đồ Uống');
        }
        return p.includes(activePeriod) || p.includes('ALL_DAY');
      });
    }

    // Lọc theo danh mục
    if (activeCategory !== ALL_CATEGORY) {
      items = items.filter((m) => m.category === activeCategory);
    }

    // Lọc theo tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))
      );
    }

    // Món bán chạy và món sẵn sàng lên đầu
    return [...items].sort((a, b) => {
      if (a.isAvailableNow && !b.isAvailableNow) return -1;
      if (!a.isAvailableNow && b.isAvailableNow) return 1;
      return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
    });
  }, [menuItems, activePeriod, activeCategory, searchQuery, currentPeriod]);

  const availableCount = filteredItems.filter((m) => (m.status === 'AVAILABLE' || m.status === 'available') && m.isAvailableNow).length;

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
        icon: <Moon size={18} color="#475569" />
      }
    };
    return periodDescriptions[currentPeriod] || periodDescriptions.NOON;
  };

  const banner = getPeriodBanner();
  const isViewingOutsidePeriod = activePeriod !== 'ALL' && activePeriod !== 'ALL_DAY' && activePeriod !== currentPeriod;

  return (
    <div style={{ fontFamily: 'var(--c-font)', background: 'var(--c-bg)', minHeight: '100%' }}>

      {/* ── Header Context + Search Bar ── */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border-light)',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-text-main)', margin: 0 }}>
              Thực Đơn Đặc Sắc OmniResto
            </h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted)' }}>
              Tinh hoa ẩm thực ba miền: Phở bò, Cơm tấm, Bánh mì chảo, Lẩu riêu cua & Thức uống thanh nhiệt
            </span>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--c-surface-warm)', border: '1.5px solid var(--c-border)',
            borderRadius: 'var(--c-r-lg)', padding: '8px 16px',
            flex: '0 1 320px', transition: 'border-color var(--c-t-fast)',
          }}>
            <Search size={16} color="var(--c-text-muted)" strokeWidth={2} />
            <input
              id="menu-search-input"
              type="text"
              placeholder="Tìm xôi, cơm tấm, bún chả, lẩu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                font: '0.875rem/1 var(--c-font)', color: 'var(--c-text-main)',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--c-text-muted)', padding: 0, lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Live Meal Period Status Banner ── */}
      <div style={{
        background: banner.bg,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {banner.icon}
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: banner.color, marginRight: 8, textTransform: 'uppercase' }}>
                ● {banner.label}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-body)' }}>
                {banner.text}
              </span>
            </div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.85)', padding: '4px 12px',
            borderRadius: 'var(--c-r-full)', fontSize: '0.75rem', fontWeight: 700,
            color: banner.color, border: '1px solid rgba(0,0,0,0.08)'
          }}>
            <Clock size={13} />
            Giờ hiện tại: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* ── Meal Period Filter Tabs (Sáng / Trưa / Tối / Cả ngày) ── */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border-light)',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '12px 24px',
          display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {MEAL_PERIOD_TABS.map((tab) => {
            const isSelected = activePeriod === tab.id;
            const isLive = tab.id === 'ALL_DAY'
              ? currentPeriod !== 'CLOSED' && currentPeriod !== 'BREAK'
              : currentPeriod === tab.id;
            return (
              <button
                key={tab.id}
                id={`meal-period-tab-${tab.id}`}
                onClick={() => setActivePeriod(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 'var(--c-r-full)',
                  border: isSelected ? '1.5px solid var(--c-primary)' : '1px solid var(--c-border)',
                  background: isSelected ? 'var(--c-primary)' : 'var(--c-surface-warm)',
                  color: isSelected ? '#fff' : 'var(--c-text-body)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: '0.875rem', fontWeight: isSelected ? 700 : 500,
                  boxShadow: isSelected ? 'var(--c-shadow-orange)' : 'none',
                  transition: 'all var(--c-t-fast)',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {isLive && (
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 800,
                    background: isSelected ? 'rgba(255,255,255,0.3)' : '#22c55e',
                    color: '#fff', padding: '2px 6px', borderRadius: 'var(--c-r-full)',
                    textTransform: 'uppercase'
                  }}>
                    Đang mở
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category Chips Filter ── */}
      <div style={{
        position: 'sticky', top: 'var(--c-header-h)', zIndex: 90,
        background: 'rgba(255,252,249,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--c-border-light)',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '10px 24px',
          display: 'flex', gap: 8, alignItems: 'center',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            const count = cat === ALL_CATEGORY ? menuItems.length : menuItems.filter((m) => m.category === cat).length;
            return (
              <button
                key={cat}
                id={`category-filter-${cat}`}
                className="c-btn"
                style={{
                  minHeight: 36,
                  padding: '6px 16px',
                  borderRadius: 'var(--c-r-full)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  background: isActive ? 'var(--c-primary)' : 'var(--c-surface)',
                  color: isActive ? '#fff' : 'var(--c-text-body)',
                  border: `1.5px solid ${isActive ? 'var(--c-primary)' : 'var(--c-border)'}`,
                  boxShadow: isActive ? 'var(--c-shadow-orange)' : 'none',
                  transition: 'all var(--c-t-fast)',
                }}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={isActive}
              >
                <span>{cat}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    opacity: isActive ? 0.9 : 0.6,
                    marginLeft: 6,
                    fontWeight: 700,
                  }}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Menu Grid + Notice ── */}
      <div style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto', padding: '24px 24px 80px' }}>

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
              Hiển thị <strong style={{ color: 'var(--c-text-body)' }}>{filteredItems.length}</strong> món
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
                Không tìm thấy món ăn phù hợp
              </strong>
              <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
                Thử chọn buổi khác hoặc xóa bộ lọc tìm kiếm
              </span>
            </div>
            <button
              className="c-btn c-btn-outline c-btn-sm"
              onClick={() => { setSearchQuery(''); setActiveCategory(ALL_CATEGORY); setActivePeriod('ALL'); }}
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
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 24px', borderRadius: 'var(--c-r-full)',
              background: 'var(--c-primary)', color: '#fff',
              border: 'none', cursor: 'pointer',
              font: '700 0.9375rem var(--c-font)',
              boxShadow: '0 8px 32px rgba(232,93,38,0.45)',
              transition: 'transform var(--c-t-fast), box-shadow var(--c-t-fast)',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(232,93,38,0.55)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(232,93,38,0.45)';
            }}
            aria-label={`Xem giỏ hàng: ${totalItems} món, ${totalAmount.toLocaleString('vi-VN')}đ`}
          >
            <div style={{
              background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--c-r-full)',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 900,
            }}>
              {totalItems}
            </div>
            <ShoppingCart size={18} strokeWidth={2.2} />
            Xem giỏ hàng · {totalAmount.toLocaleString('vi-VN')}đ
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientMenu;
