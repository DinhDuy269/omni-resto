import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Utensils, CalendarCheck, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';

/**
 * ClientHome — Single Restaurant Landing Page
 */
const ClientHome: React.FC = () => {
  const navigate = useNavigate();
  const { menuItems } = useAdminStore();

  const bestSellers = menuItems.filter((m) => m.isBestSeller).slice(0, 4);

  return (
    <div style={{ fontFamily: 'var(--c-font)' }}>

      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — HERO
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

        {/* Warm gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, rgba(18,8,2,0.82) 0%, rgba(18,8,2,0.55) 55%, rgba(18,8,2,0.2) 100%)',
        }} />

        {/* Subtle texture overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 70% 50%, rgba(232,93,38,0.15) 0%, transparent 60%)',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 'var(--c-max-w)', margin: '0 auto',
          padding: '80px 24px', width: '100%',
        }}>
          <div style={{ maxWidth: 580 }}>
            {/* Eyebrow label */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: 'rgba(232,93,38,0.25)', border: '1px solid rgba(232,93,38,0.4)',
              borderRadius: 'var(--c-r-full)', padding: '5px 16px',
            }}>
              <Sparkles size={13} color="var(--c-accent)" strokeWidth={2.5} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Nhà hàng ẩm thực cao cấp
              </span>
            </div>

            {/* Main heading */}
            <h1 style={{
              fontFamily: 'var(--c-font-display)',
              fontSize: 'clamp(2.4rem, 5.5vw, 3.75rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              color: '#fff',
              lineHeight: 1.1,
              margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}>
              Hương Vị Đích Thực<br />
              <span style={{ color: 'var(--c-accent)', fontStyle: 'normal', fontWeight: 700 }}>Việt Nam</span>
            </h1>

            {/* Sub-heading */}
            <p style={{
              fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)',
              color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, marginBottom: 32, maxWidth: 460,
            }}>
              Đặt bàn và gọi món trực tuyến tại OmniResto. 
              Trải nghiệm ẩm thực Việt chuẩn vị truyền thống từ nguyên liệu tươi sạch thượng hạng.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
              <button
                id="hero-order-btn"
                className="c-btn c-btn-primary c-btn-lg"
                onClick={() => navigate('/client/menu')}
              >
                🍜 Xem Thực Đơn & Đặt Món
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
              <button
                id="hero-reservation-btn"
                className="c-btn c-btn-lg"
                style={{
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={() => navigate('/client/reservation')}
              >
                📅 Đặt Bàn Ngay
              </button>
            </div>

            {/* Social proof */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {[
                { icon: '⭐', value: '4.9/5', label: '2,400+ đánh giá' },
                { icon: '🍲', value: `${menuItems.length}+ món`, label: 'Đặc sắc ẩm thực' },
                { icon: '⚡', value: '15 phút', label: 'Phục vụ nhanh chóng' },
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
          ZONE 2 — RESTAURANT EXPERIENCE & HIGHLIGHTS
          ════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--c-bg)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 'var(--c-max-w)', margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{
              display: 'inline-block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              ✨ Trải nghiệm OmniResto
            </span>
            <h2 style={{
              fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 800,
              color: 'var(--c-text-main)', margin: '0 0 8px',
            }}>
              Dịch Vụ Ẩm Thực Đẳng Cấp
            </h2>
            <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9375rem', maxWidth: 480, margin: '0 auto' }}>
              Không gian sang trọng, nguyên liệu tươi sạch và quy trình phục vụ chuyên nghiệp
            </p>
          </div>

          {/* Highlights grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                icon: Utensils,
                title: 'Ẩm Thực Tinh Hoa',
                desc: 'Thực đơn đa dạng với công thức gia truyền, kết hợp hài hòa phong vị ba miền Bắc - Trung - Nam.',
                color: 'var(--c-primary)',
              },
              {
                icon: CalendarCheck,
                title: 'Đặt Bàn Nhanh Chóng',
                desc: 'Hệ thống giữ chỗ trực tuyến tiện lợi, xác nhận tức thì và hỗ trợ chọn vị trí bàn yêu thích.',
                color: '#2563eb',
              },
              {
                icon: Clock,
                title: 'Phục Vụ Nhanh Chuẩn',
                desc: 'Tích hợp hệ thống màn hình bếp thông minh giúp món ăn luôn nóng hổi và chuẩn vị trong 15 phút.',
                color: '#16a34a',
              },
              {
                icon: ShieldCheck,
                title: 'Nguyên Liệu Tươi Sạch',
                desc: '100% nguyên liệu tự nhiên tươi ngon được tuyển chọn mỗi ngày từ các nông trại đạt chuẩn vệ sinh ATTP.',
                color: '#d97706',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 'var(--c-r-lg)',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: 'var(--c-shadow-sm)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-sm)';
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${feature.color}15`,
                      color: feature.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: 0 }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — BEST SELLERS
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
