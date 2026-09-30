import React, { useState, useMemo } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { useClientStore, selectTotalItems, selectTotalAmount } from '../../store/clientStore';
import { MenuCard } from '../../components/MenuCard';

const ALL_CATEGORY = 'Tất cả';

/**
 * ClientMenu — Browsing + ordering interface
 */
export const ClientMenu: React.FC = () => {
  const { menuItems } = useAdminStore();
  const { openCart } = useClientStore();
  const totalItems  = useClientStore(selectTotalItems);
  const totalAmount = useClientStore(selectTotalAmount);

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [searchQuery,    setSearchQuery]    = useState('');

  // Build category list (Hick's Law: limit choice set)
  const categories: string[] = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category))) as string[];
    return [ALL_CATEGORY, ...cats];
  }, [menuItems]);

  // Filter + sort items (Serial Position: best sellers first)
  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (activeCategory !== ALL_CATEGORY) {
      items = items.filter((m) => m.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    // Best sellers first (Serial Position Effect)
    return [...items].sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
  }, [menuItems, activeCategory, searchQuery]);

  const availableCount   = filteredItems.filter((m) => m.status === 'AVAILABLE' || m.status === 'available').length;
  const unavailableCount = filteredItems.length - availableCount;

  return (
    <div style={{ fontFamily: 'var(--c-font)', background: 'var(--c-bg)', minHeight: '100%' }}>

      {/* ── Context + Search Bar (F-Pattern: top row) ── */}
      <div style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border-light)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          {/* Context label */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--c-text-main)', margin: 0 }}>
              Thực Đơn
            </h1>
            <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
              Nhà hàng OmniResto
            </span>
          </div>

          {/* Search — Hick's Law: narrow down choices fast */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--c-surface-warm)', border: '1.5px solid var(--c-border)',
            borderRadius: 'var(--c-r-lg)', padding: '8px 16px',
            flex: '0 1 320px', transition: 'border-color var(--c-t-fast)',
          }}
            onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-primary)'; }}
            onBlurCapture={e  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; }}
          >
            <Search size={16} color="var(--c-text-muted)" strokeWidth={2} />
            <input
              id="menu-search-input"
              type="text"
              placeholder="Tìm món ăn..."
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

      {/* ── Sticky Category Filter (Miller's Law: max 7 visible) ── */}
      <div style={{
        position: 'sticky', top: 'var(--c-header-h)', zIndex: 100,
        background: 'rgba(255,252,249,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--c-border-light)',
        overflowX: 'auto',
        /* Hide scrollbar while allowing scroll */
        scrollbarWidth: 'none',
      }}>
        <div style={{
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '10px 24px',
          display: 'flex', gap: 8, alignItems: 'center',
          width: 'max-content', minWidth: '100%',
        }}>
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                id={`category-filter-${cat}`}
                className="c-btn"
                style={{
                  minHeight: 38, padding: '6px 18px', borderRadius: 'var(--c-r-full)',
                  fontSize: '0.875rem', fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  background: isActive ? 'var(--c-primary)' : 'var(--c-surface)',
                  color: isActive ? '#fff' : 'var(--c-text-body)',
                  border: `1.5px solid ${isActive ? 'var(--c-primary)' : 'var(--c-border)'}`,
                  boxShadow: isActive ? 'var(--c-shadow-orange)' : 'none',
                  transition: 'all var(--c-t-fast)',
                }}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={isActive}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Menu Grid + Floating Cart ── */}
      <div style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Results summary */}
        {filteredItems.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
              <strong style={{ color: 'var(--c-text-body)' }}>{filteredItems.length}</strong> món
              {activeCategory !== ALL_CATEGORY && ` · ${activeCategory}`}
            </span>
            {availableCount < filteredItems.length && (
              <span className="c-badge c-badge-gray">
                {unavailableCount} tạm hết
              </span>
            )}
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
                Không tìm thấy món
              </strong>
              <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>
                Thử từ khóa khác hoặc chọn danh mục khác
              </span>
            </div>
            <button
              className="c-btn c-btn-outline c-btn-sm"
              onClick={() => { setSearchQuery(''); setActiveCategory(ALL_CATEGORY); }}
            >
              Xem tất cả món
            </button>
          </div>
        )}

        {/* 2-column card grid (F-Pattern: scan left first) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {filteredItems.map((item, idx) => (
            <MenuCard
              key={item.id}
              item={item}
              animationDelay={Math.min(idx * 50, 400)}
            />
          ))}
        </div>
      </div>

      {/* ── Floating Cart CTA — Fitts's Law: large, always visible ── */}
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
