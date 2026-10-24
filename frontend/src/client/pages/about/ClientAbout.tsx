import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award, MapPin, Star, Users, Clock, Flame, ChevronRight,
  Leaf, ChefHat, Heart, Sprout, UtensilsCrossed, QrCode,
} from 'lucide-react';
import './ClientAbout.css';

/* ── Static Data ── */

const STATS = [
  { icon: <MapPin size={22} />, value: '100+', label: 'Món đặc sắc', color: '#e8533d', bg: 'rgba(232, 83, 61, 0.1)' },
  { icon: <Users size={22} />, value: '50,000+', label: 'Thực khách', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { icon: <Star size={22} />, value: '4.9★', label: 'Đánh giá TB', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  { icon: <Clock size={22} />, value: '10+', label: 'Năm kinh nghiệm', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
];

const VALUES = [
  {
    icon: <Leaf size={22} />,
    title: 'Nguyên liệu sạch & Tươi ngon',
    desc: 'Chúng tôi chỉ chọn nguyên liệu từ các nhà cung cấp uy tín được kiểm định chất lượng — ưu tiên nông trại địa phương, thực phẩm hữu cơ và hải sản theo mùa.',
  },
  {
    icon: <ChefHat size={22} />,
    title: 'Đầu bếp & Nghệ nhân ẩm thực',
    desc: 'Đội ngũ bếp trưởng của chúng tôi được đào tạo tại các trường ẩm thực hàng đầu và có kinh nghiệm tại Việt Nam lẫn quốc tế, mang đến từng tô phở như một tác phẩm nghệ thuật.',
  },
  {
    icon: <Heart size={22} />,
    title: 'Đặt khách hàng làm trung tâm',
    desc: 'Từ không gian bàn, phục vụ đến từng chi tiết nhỏ nhất — chúng tôi thiết kế mọi trải nghiệm để bạn luôn muốn quay lại lần nữa.',
  },
  {
    icon: <Sprout size={22} />,
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

/* ── Component ── */

const ClientAbout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="ca-page">

      {/* ════════════════════════════════════════════════════════════
          HERO — Không gian bếp & Đội ngũ (ảnh khác ClientHome)
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-hero" aria-label="Câu chuyện thương hiệu OmniResto">
        <img
          src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=1400&auto=format&fit=crop&q=80"
          alt="Đội ngũ đầu bếp OmniResto trong không gian bếp chuyên nghiệp"
          className="ca-hero-img"
          loading="eager"
        />
        <div className="ca-hero-overlay" aria-hidden="true" />
        <div className="ca-hero-body">
          <div className="ca-hero-eyebrow">
            <Flame size={14} strokeWidth={2.4} />
            Câu chuyện thương hiệu
          </div>
          <h1 className="ca-hero-title">
            OmniResto —<br />
            <span className="ca-hero-title-accent">Ẩm thực Việt</span> trong từng tô phở
          </h1>
          <p className="ca-hero-desc">
            Từ một góc nhỏ ở phố Tràng Tiền, OmniResto lớn lên thành chuỗi nhà hàng chuẩn mực —
            nơi mỗi bữa ăn là một hành trình khám phá tinh hoa ẩm thực Việt Nam.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          STATS RIBBON
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-stats-section" aria-label="Thành tích nổi bật">
        <div className="ca-container">
          <div className="ca-stats-grid">
            {STATS.map((stat) => (
              <div key={stat.label} className="ca-stat-item">
                <div className="ca-stat-icon" style={{ background: stat.bg, color: stat.color }}>
                  {stat.icon}
                </div>
                <div className="ca-stat-value">{stat.value}</div>
                <div className="ca-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          OUR STORY
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-story-section" aria-label="Câu chuyện của chúng tôi">
        <div className="ca-container">
          <div className="ca-story-grid">
            <div>
              <div className="ca-story-section-tag">Câu chuyện của chúng tôi</div>
              <h2 className="ca-story-title">Bắt đầu từ một tô phở</h2>
              <p className="ca-story-para">
                Năm 2014, Chef Tuấn mở một quán nhỏ 20 chỗ ngồi tại 42 Tràng Tiền, Hà Nội. Triết lý đơn giản:
                nấu phở với nước dùng hầm xương 24 giờ, nguyên liệu tươi từ chợ sáng, và phục vụ với nụ cười chân thành.
              </p>
              <p className="ca-story-para">
                Chỉ trong 2 năm, lượng khách vượt gấp 5 lần sức chứa. OmniResto ra đời năm 2016 như một nền tảng
                mở rộng sứ mệnh đó — đưa ẩm thực Việt tinh hoa đến gần hơn với mọi người, ở mọi thành phố.
              </p>
            </div>
            <div className="ca-story-img-wrap">
              <img
                src="https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=600&auto=format&fit=crop&q=80"
                alt="Chef đang chuẩn bị tô phở truyền thống OmniResto"
                className="ca-story-img"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          VALUES — Sử dụng Lucide icons, KHÔNG dùng emoji
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-values-section" aria-label="Giá trị cốt lõi">
        <div className="ca-container">
          <div className="ca-section-head">
            <div className="ca-eyebrow">Giá trị cốt lõi</div>
            <h2 className="ca-section-title">Những điều chúng tôi tin tưởng</h2>
          </div>
          <div className="ca-values-grid">
            {VALUES.map((v) => (
              <div key={v.title} className="ca-value-card">
                <div className="ca-value-icon-wrap">{v.icon}</div>
                <h3 className="ca-value-title">{v.title}</h3>
                <p className="ca-value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          TEAM
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-team-section" aria-label="Đội ngũ OmniResto">
        <div className="ca-container">
          <div className="ca-section-head">
            <div className="ca-eyebrow">Đội ngũ</div>
            <h2 className="ca-section-title">Những con người làm nên OmniResto</h2>
          </div>
          <div className="ca-team-grid">
            {TEAM.map((member) => (
              <div key={member.name} className="ca-team-card">
                <div className="ca-team-img-wrap">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="ca-team-img"
                    loading="lazy"
                  />
                </div>
                <div className="ca-team-body">
                  <div className="ca-team-name">{member.name}</div>
                  <div className="ca-team-role">{member.role}</div>
                  <p className="ca-team-bio">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          AWARDS
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-awards-section" aria-label="Giải thưởng và ghi nhận">
        <div className="ca-container">
          <div className="ca-section-head">
            <div className="ca-eyebrow">Giải thưởng & Ghi nhận</div>
            <h2 className="ca-section-title">Hành trình được công nhận</h2>
          </div>
          <div className="ca-awards-list">
            {AWARDS.map((award) => (
              <div key={award.title} className="ca-award-item">
                <div className="ca-award-icon-box">
                  <Award size={22} color="#d97706" strokeWidth={2} />
                </div>
                <div className="ca-award-info">
                  <div className="ca-award-title">{award.title}</div>
                  <div className="ca-award-org">{award.org}</div>
                </div>
                <div className="ca-award-year">{award.year}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA FINALE — Lucide icon thay emoji 🍜
          ════════════════════════════════════════════════════════════ */}
      <section className="ca-cta-section" aria-label="Bắt đầu trải nghiệm">
        <div className="ca-container">
          <div className="ca-cta-body">
            <div className="ca-cta-icon-badge">
              <UtensilsCrossed size={30} strokeWidth={2} />
            </div>
            <h2 className="ca-cta-title">Sẵn sàng trải nghiệm chưa?</h2>
            <p className="ca-cta-desc">
              Khám phá thực đơn phong phú và trải nghiệm ẩm thực trọn vẹn cùng gia đình và người thân.
            </p>
            <div className="ca-cta-actions">
              <button
                id="about-cta-menu-btn"
                className="ca-btn-primary"
                onClick={() => navigate('/client/menu')}
              >
                <UtensilsCrossed size={17} strokeWidth={2.2} />
                Xem thực đơn
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
              <button
                id="about-cta-scan-btn"
                className="ca-btn-ghost"
                onClick={() => navigate('/client/scan')}
              >
                <QrCode size={17} strokeWidth={2.2} />
                Quét mã bàn
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default ClientAbout;
