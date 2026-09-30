import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, MapPin, Star, Users, Clock, Flame, ChevronRight } from 'lucide-react';

const STATS = [
  { icon: <MapPin size={22} />, value: '100+', label: 'Món đặc sắc', color: '#e8533d' },
  { icon: <Users size={22} />, value: '50,000+', label: 'Thực khách', color: '#2563eb' },
  { icon: <Star size={22} />, value: '4.9★', label: 'Đánh giá TB', color: '#d97706' },
  { icon: <Clock size={22} />, value: '10+', label: 'Năm kinh nghiệm', color: '#7c3aed' },
];

const VALUES = [
  {
    icon: '🥘',
    title: 'Nguyên liệu sạch & Tươi ngon',
    desc: 'Chúng tôi chỉ chọn nguyên liệu từ các nhà cung cấp uy tín được kiểm định chất lượng — ưu tiên nông trại địa phương, thực phẩm hữu cơ và hải sản theo mùa.',
  },
  {
    icon: '👨‍🍳',
    title: 'Đầu bếp & Nghệ nhân ẩm thực',
    desc: 'Đội ngũ bếp trưởng của chúng tôi được đào tạo tại các trường ẩm thực hàng đầu và có kinh nghiệm tại Việt Nam lẫn quốc tế, mang đến từng tô phở như một tác phẩm nghệ thuật.',
  },
  {
    icon: '❤️',
    title: 'Đặt khách hàng làm trung tâm',
    desc: 'Từ không gian bàn, phục vụ đến từng chi tiết nhỏ nhất — chúng tôi thiết kế mọi trải nghiệm để bạn luôn muốn quay lại lần nữa.',
  },
  {
    icon: '🌱',
    title: 'Phát triển bền vững',
    desc: 'OmniResto cam kết giảm thiểu rác thải thực phẩm, sử dụng bao bì thân thiện môi trường và hỗ trợ cộng đồng nông nghiệp địa phương.',
  },
];

const TEAM = [
  {
    name: 'Chef Nguyễn Minh Tuấn',
    role: 'Head Chef & Sáng lập',
    bio: '20 năm kinh nghiệm ẩm thực Việt Nam và Pháp. Tốt nghiệp Le Cordon Bleu Paris, từng làm việc tại nhiều nhà hàng 5 sao tại Châu Á.',
    img: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Trần Thị Thu Hà',
    role: 'Giám đốc Vận hành',
    bio: 'Chuyên gia quản lý chuỗi F&B với 15 năm kinh nghiệm. Xây dựng quy trình chuẩn hóa cho toàn hệ thống OmniResto.',
    img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Chef Lê Văn Phong',
    role: 'Executive Chef — Miền Nam',
    bio: 'Chuyên gia ẩm thực Nam Bộ với niềm đam mê đặc biệt với Cơm Tấm và các món đặc sản Sài Gòn truyền thống.',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  },
];

const AWARDS = [
  { year: '2024', title: 'Top 10 Chuỗi Nhà Hàng Uy Tín Nhất', org: 'Vietnam Restaurant Awards' },
  { year: '2023', title: 'Giải Chất Lượng Phục Vụ Xuất Sắc', org: "TripAdvisor Travelers' Choice" },
  { year: '2023', title: 'Thương Hiệu F&B Được Yêu Thích Nhất', org: 'Khảo sát Người Tiêu Dùng Việt' },
  { year: '2022', title: 'Top 5 Phở Ngon Nhất Hà Nội', org: 'Foody & Zomato Choice Awards' },
];

const ClientAbout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'var(--c-font)' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&auto=format&fit=crop&q=80"
          alt="OmniResto restaurant interior"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(18,8,2,0.88) 0%, rgba(18,8,2,0.45) 100%)' }} />
        <div style={{
          position: 'relative', zIndex: 1, height: '100%', maxWidth: 860, margin: '0 auto', padding: '0 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <Flame size={14} /> Câu chuyện thương hiệu
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.15 }}>
            OmniResto —<br />
            <span style={{ color: '#fbbf24' }}>Ẩm thực Việt</span> trong từng tô phở
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '1.0625rem', margin: 0, maxWidth: 560, lineHeight: 1.7 }}>
            Từ một góc nhỏ ở phố Tràng Tiền, OmniResto lớn lên thành chuỗi nhà hàng chuẩn mực — nơi mỗi bữa ăn là một hành trình khám phá tinh hoa ẩm thực Việt Nam.
          </p>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24 }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', margin: '0 auto 12px',
                  background: `${stat.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.color,
                }}>
                  {stat.icon}
                </div>
                <div style={{ fontSize: '1.625rem', fontWeight: 900, color: 'var(--c-text-main)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Story ─────────────────────────────────────────────────────── */}
      <section>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                Câu chuyện của chúng tôi
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: '0 0 16px', lineHeight: 1.3 }}>
                Bắt đầu từ một tô phở
              </h2>
              <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.8, fontSize: '0.9375rem', margin: '0 0 16px' }}>
                Năm 2014, Chef Tuấn mở một quán nhỏ 20 chỗ ngồi tại 42 Tràng Tiền, Hà Nội. Triết lý đơn giản: nấu phở với nước dùng hầm xương 24 giờ, nguyên liệu tươi từ chợ sáng, và phục vụ với nụ cười chân thành.
              </p>
              <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.8, fontSize: '0.9375rem', margin: 0 }}>
                Chỉ trong 2 năm, lượng khách vượt gấp 5 lần sức chứa. OmniResto ra đời năm 2016 như một nền tảng mở rộng sứ mệnh đó — đưa ẩm thực Việt tinh hoa đến gần hơn với mọi người, ở mọi thành phố.
              </p>
            </div>
            <div style={{ borderRadius: 'var(--c-r-xl)', overflow: 'hidden', height: 340 }}>
              <img
                src="https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=600&auto=format&fit=crop"
                alt="Chef preparing pho"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Giá trị cốt lõi
            </div>
            <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: 0 }}>
              Những điều chúng tôi tin tưởng
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {VALUES.map((v) => (
              <div key={v.title} style={{
                background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--c-r-xl)', padding: '28px',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-lg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{v.icon}</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-text-main)', margin: '0 0 10px' }}>{v.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ──────────────────────────────────────────────────────────── */}
      <section>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Đội ngũ
            </div>
            <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: 0 }}>
              Những con người làm nên OmniResto
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 28 }}>
            {TEAM.map((member) => (
              <div key={member.name} style={{
                background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--c-r-xl)', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-lg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ height: 220, overflow: 'hidden' }}>
                  <img
                    src={member.img}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s' }}
                  />
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--c-text-main)', marginBottom: 4 }}>{member.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--c-primary)', fontWeight: 600, marginBottom: 10 }}>{member.role}</div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', lineHeight: 1.65, margin: 0 }}>{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Awards ────────────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Giải thưởng & Ghi nhận
            </div>
            <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: 0 }}>
              Hành trình được công nhận
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {AWARDS.map((award) => (
              <div key={award.title} style={{
                display: 'flex', alignItems: 'center', gap: 20,
                background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--c-r-lg)', padding: '20px 24px',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--c-r-md)', flexShrink: 0,
                  background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Award size={22} color="#d97706" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--c-text-main)', marginBottom: 4 }}>{award.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>{award.org}</div>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 'var(--c-r-full)',
                  background: 'rgba(251,191,36,0.12)', color: '#d97706',
                  fontSize: '0.875rem', fontWeight: 700,
                }}>
                  {award.year}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🍜</div>
          <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: '0 0 12px' }}>
            Sẵn sàng trải nghiệm chưa?
          </h2>
          <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 32px', fontSize: '0.9375rem' }}>
            Đặt bàn ngay hôm nay để có bữa ăn trọn vẹn nhất cùng gia đình và người thân.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="c-btn c-btn-primary c-btn-lg"
              onClick={() => navigate('/client/reservation')}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Đặt bàn ngay <ChevronRight size={18} />
            </button>
            <button
              className="c-btn c-btn-lg"
              onClick={() => navigate('/client/menu')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1.5px solid var(--c-border)', color: 'var(--c-text-main)' }}
            >
              Xem thực đơn
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClientAbout;
