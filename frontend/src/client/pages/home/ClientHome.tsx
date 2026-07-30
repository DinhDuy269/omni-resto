import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, ArrowRight, Clock, Users, ChevronRight, Sparkles } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { useClientStore } from '../../store/clientStore';

/**
 * ClientHome — Landing page
 *
 * Layout: Z-Pattern scanning
 *   Zone 1 (Top): Hero — Logo → tagline → CTAs → social proof
 *   Zone 2 (Mid-left): Branch selection cards
 *   Zone 3 (Mid-right): Category shortcuts
 *   Zone 4 (Bottom): Best sellers preview (Serial Position Effect)
 *
 * UX Principles:
 * - Z-Pattern: Logo top-left → CTA top-right → branches → best sellers
 * - Color Psychology: Warm orange hero → appetite stimulation
 * - Social Proof: Rating + review count in hero
 * - Progressive Disclosure: Home → select branch → menu
 * - Fitts's Law: Branch cards large enough to tap; CTA buttons prominent
 * - Serial Position Effect: Best sellers at end of page (memorable)
 */
const ClientHome: React.FC = () => {
  const navigate = useNavigate();
  const { branches, menuItems } = useAdminStore();
  const { setSelectedBranch } = useClientStore();

  const activeBranches = branches.filter((b) => b.status === 'ACTIVE');
  const bestSellers    = menuItems.filter((m) => m.isBestSeller).slice(0, 4);

  const handleSelectBranch = (id: string, name: string) => {
    setSelectedBranch(id, name);
    navigate('/client/menu');
  };

  return (
    <div style={{ fontFamily: 'var(--c-font)' }}>

      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — HERO  (Z-Pattern top sweep)
          Color Psychology: Warm orange gradient over food image
          ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative', overflow: 'hidden',
          minHeight: '62vh', display: 'flex', alignItems: 'center',
        }}
      >
        {/* Background food image */}
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
          }}
        />

        {/* Warm gradient overlay — ensures text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, rgba(18,8,2,0.82) 0%, rgba(18,8,2,0.55) 55%, rgba(18,8,2,0.2) 100%)',
        }} />

        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 70% 50%, rgba(232,93,38,0.15) 0%, transparent 60%)',
        }} />

        {/* Hero content — left aligned (F-pattern natural start) */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '80px 24px', width: '100%',
        }}>
          <div style={{ maxWidth: 580 }}>
            {/* Eyebrow label — context primer */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'rgba(232,93,38,0.25)', border: '1px solid rgba(232,93,38,0.4)',
              borderRadius: 'var(--c-r-full)', padding: '5px 16px',
            }}>
              <Sparkles size={13} color="var(--c-accent)" strokeWidth={2.5} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Hệ thống nhà hàng cao cấp
              </span>
            </div>

            {/* Main heading — largest element, draws eye first */}
            <h1 style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              fontWeight: 900, color: '#fff',
              lineHeight: 1.15, margin: '0 0 16px',
              letterSpacing: '-0.02em',
            }}>
              Hương Vị Đích Thực<br />
              <span style={{ color: 'var(--c-accent)' }}>Việt Nam</span>
            </h1>

            {/* Sub-heading */}
            <p style={{
              fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)',
              color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, marginBottom: 32, maxWidth: 460,
            }}>
              Đặt bàn, gọi món trực tuyến tại {activeBranches.length} chi nhánh OmniResto trên toàn quốc. 
              Trải nghiệm ẩm thực Việt chuẩn vị từ nguyên liệu tươi sạch.
            </p>

            {/* CTAs — Fitts's Law: large buttons, high contrast */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
              <button
                id="hero-order-btn"
                className="c-btn c-btn-primary c-btn-lg"
                onClick={() => navigate('/client/menu')}
              >
                🍜 Đặt món ngay
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
              <button
                className="c-btn c-btn-lg"
                style={{
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={() => {
                  document.getElementById('branches-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <MapPin size={16} /> Chọn chi nhánh
              </button>
            </div>

            {/* Social proof — builds trust (anchoring cognition) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {[
                { icon: '⭐', value: '4.9/5', label: '2,400+ đánh giá' },
                { icon: '🏪', value: `${activeBranches.length} chi nhánh`, label: 'Toàn quốc' },
                { icon: '⚡', value: '15 phút', label: 'Phục vụ nhanh' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>{item.value}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)' }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2 — BRANCH SELECTION
          Progressive Disclosure: select branch before seeing menu
          ════════════════════════════════════════════════════════════ */}
      <section
        id="branches-section"
        style={{ background: 'var(--c-bg)', padding: '64px 24px' }}
      >
        <div style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{
              display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              📍 Chọn địa điểm
            </span>
            <h2 style={{
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 800,
              color: 'var(--c-text-main)', margin: '0 0 8px',
            }}>
              Chi Nhánh Đang Phục Vụ
            </h2>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9375rem', maxWidth: 480, margin: '0 auto' }}>
              Chọn chi nhánh gần bạn để xem thực đơn và đặt bàn trực tuyến
            </p>
          </div>

          {/* Branch cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {activeBranches.map((branch, i) => (
              <article
                key={branch.id}
                className="c-animate-fade-up"
                style={{
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: 'var(--c-r-lg)', overflow: 'hidden',
                  boxShadow: 'var(--c-shadow-sm)', cursor: 'pointer',
                  transition: 'all var(--c-t-normal)',
                  animationDelay: `${i * 80}ms`,
                }}
                onClick={() => handleSelectBranch(branch.id, branch.name)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-lg)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-primary)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-sm)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)';
                }}
                aria-label={`Chọn ${branch.name}`}
              >
                {/* Branch header strip */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--c-primary) 0%, #c44d1b 100%)',
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{
                    fontSize: '1.25rem', fontWeight: 900, color: 'rgba(255,255,255,0.35)',
                    letterSpacing: '-0.02em',
                  }}>
                    {branch.code}
                  </span>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--c-r-full)',
                    padding: '4px 10px',
                  }}>
                    <Star size={12} fill="#fbbf24" stroke="none" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{branch.rating}</span>
                  </div>
                </div>

                {/* Branch details */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)',
                    margin: 0, lineHeight: 1.3,
                  }}>
                    {branch.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <MapPin size={14} color="var(--c-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', lineHeight: 1.45 }}>
                      {branch.address}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={13} color="var(--c-text-muted)" />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                        {branch.tablesCount} bàn
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} color="var(--c-primary)" />
                      <span style={{ fontSize: '0.8125rem', color: 'var(--c-primary)', fontWeight: 600 }}>
                        Đang mở
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA row */}
                <div style={{
                  padding: '12px 20px', borderTop: '1px solid var(--c-border-light)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--c-surface-warm)',
                }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--c-primary)' }}>
                    Xem thực đơn
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — BEST SELLERS
          Serial Position Effect: memorable items at end of page
          ════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--c-surface)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{
              display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              🔥 Nổi bật
            </span>
            <h2 style={{
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 800,
              color: 'var(--c-text-main)', margin: '0 0 8px',
            }}>
              Món Ăn Được Yêu Thích Nhất
            </h2>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9375rem' }}>
              Được hàng nghìn thực khách lựa chọn mỗi ngày
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {bestSellers.map((item, i) => (
              <div
                key={item.id}
                className="c-animate-fade-up"
                style={{
                  background: 'var(--c-bg)', border: '1px solid var(--c-border-light)',
                  borderRadius: 'var(--c-r-lg)', overflow: 'hidden',
                  transition: 'all var(--c-t-normal)', cursor: 'pointer',
                  animationDelay: `${i * 80}ms`,
                }}
                onClick={() => navigate('/client/menu')}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-md)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform var(--c-t-slow)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = ''; }}
                  />
                  <div style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'var(--c-primary)', color: '#fff',
                    fontSize: '0.6875rem', fontWeight: 800, fontFamily: 'var(--c-font)',
                    padding: '3px 10px', borderRadius: 'var(--c-r-full)',
                    boxShadow: '0 2px 8px rgba(232,93,38,0.4)',
                  }}>
                    🔥 Bán chạy
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 4px', lineHeight: 1.3 }}>
                    {item.name}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem', color: 'var(--c-text-muted)', margin: '0 0 10px', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-primary)' }}>
                      {item.basePrice.toLocaleString('vi-VN')}đ
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)' }}>
                      {item.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA to full menu */}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <button
              id="view-full-menu-btn"
              className="c-btn c-btn-outline c-btn-lg"
              onClick={() => navigate('/client/menu')}
            >
              Xem toàn bộ thực đơn
              <ArrowRight size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default ClientHome;
