import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  UtensilsCrossed,
  QrCode,
  ArrowRight,
  Star,
  ChefHat,
  Clock,
  ShieldCheck,
  Flame,
  CalendarCheck,
  CreditCard,
  Plus,
  Award,
  Quote,
} from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
import { menuApi } from '../../../admin/pages/menu/menuApi';
import type { MenuItem } from '../../../shared/types/menu';
import './ClientHome.css';

/**
 * Danh sách món ăn Signature tiêu biểu (Fallback an toàn khi API chưa tải xong)
 */
const FALLBACK_SIGNATURE_DISHES: MenuItem[] = [
  {
    id: 'dish-wagyu-pho',
    name: 'Phở Bò Tái Nạm Wagyu A5 Thượng Hạng',
    category: 'Món nước',
    base_price: 185000,
    description: 'Nước dùng ninh 24h từ xương ống bò tủy, thịt bò Wagyu vân mỡ cẩm thạch mềm tan cùng bánh phở thủ công tươi mới.',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
    is_best_seller: true,
    status: 'available',
  },
  {
    id: 'dish-crab-hotpot',
    name: 'Set Lẩu Riêu Cua Đồng Bắp Bò Mỹ',
    category: 'Lẩu & Nướng',
    base_price: 385000,
    description: 'Gạch cua đồng Cà Mau béo ngậy, giấm bỗng nếp truyền thống kết hợp bắp bò hoa giòn sần sật và rổ rau đồng quê.',
    image: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=800&auto=format&fit=crop&q=80',
    is_best_seller: true,
    status: 'available',
  },
  {
    id: 'dish-lotus-tea',
    name: 'Trà Sen Vàng Long Nhãn Khởi Sắc',
    category: 'Đồ uống',
    base_price: 65000,
    description: 'Trà Ô long ủ lạnh thơm thanh khiết, hạt sen Huế bùi bở hòa quyện cùng cùi nhãn lồng mọng nước và bọt sữa mặn kem béo.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=80',
    is_best_seller: true,
    status: 'available',
  },
  {
    id: 'dish-royal-spring-rolls',
    name: 'Nem Công Chả Phượng Ngũ Sắc Hoàng Triều',
    category: 'Khai vị',
    base_price: 145000,
    description: 'Món ăn cung đình tái hiện tinh xảo với tôm sú tự nhiên, thịt cua biển và sốt chấm ngũ vị độc quyền của bếp trưởng.',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
    is_best_seller: true,
    status: 'available',
  },
];

/**
 * ClientHome — Trang chủ Nền tảng F&B Cao cấp OmniResto
 * Áp dụng toàn diện Tiêu chuẩn Thiết kế:
 * - Font Chữ: Plus Jakarta Sans (Display/Heading/CTA) & Inter (Body Text)
 * - Font Số: Tabular Lining Figures (Giá tiền) & Slashed Zero Mono (Mã đơn/Stats)
 * - Iconography: Lucide SVG Vectors (Zero Raw Emojis)
 */
export const ClientHome: React.FC = () => {
  const navigate = useNavigate();
  const { menu_items, setMenuItems } = useAdminStore();

  // Nạp tự động dữ liệu thực đơn từ Backend khi vào trang chủ
  useEffect(() => {
    if (menu_items.length === 0) {
      menuApi
        .getMenuItems()
        .then((items) => {
          if (items && items.length > 0) {
            setMenuItems(items);
          }
        })
        .catch((err) => {
          console.warn('Lỗi tải danh mục món ăn trang chủ từ server:', err);
        });
    }
  }, [menu_items.length, setMenuItems]);

  // Lọc món Best Seller thực tế hoặc sử dụng danh mục món Signature
  const displayDishes = React.useMemo(() => {
    const fromStore = menu_items.filter((m) => m.is_best_seller || m.status === 'available');
    if (fromStore.length >= 4) {
      return fromStore.slice(0, 4);
    }
    return FALLBACK_SIGNATURE_DISHES;
  }, [menu_items]);

  const totalDishesCount = menu_items.length > 0 ? menu_items.length : 36;

  return (
    <div className="ch-page">
      {/* ════════════════════════════════════════════════════════════
          ZONE 1 — HERO SHOWCASE (Fine-Dining Luxury Ambient)
          ════════════════════════════════════════════════════════════ */}
      <section className="ch-hero" aria-label="Giới thiệu nhà hàng OmniResto">
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=80"
          alt="Không gian nhà hàng sang trọng OmniResto"
          className="ch-hero-bg-img"
          loading="eager"
        />
        <div className="ch-hero-overlay-dark" />
        <div className="ch-hero-overlay-radial" />

        <div className="ch-hero-container">
          <div className="ch-hero-content">
            {/* Eyebrow Pill */}
            <div className="ch-hero-eyebrow">
              <Sparkles size={14} color="#fbbf24" strokeWidth={2.4} />
              <span className="ch-hero-eyebrow-text">
                Tinh Hoa Ẩm Thực Việt Nam · Michelin Guide Selection
              </span>
            </div>

            {/* Display Heading */}
            <h1 className="ch-hero-title">
              Hương Vị Đích Thực <br />
              <span className="ch-hero-title-accent">Nghệ Thuật Ẩm Thực Đương Đại</span>
            </h1>

            {/* Sub-heading */}
            <p className="ch-hero-desc">
              Trải nghiệm hành trình vị giác thượng hạng từ nguyên liệu tươi sạch nông trại đến bàn ăn,
              kết hợp hoàn hảo cùng công nghệ gọi món thông minh và phục vụ chuẩn 5 sao.
            </p>

            {/* Primary Action Cluster */}
            <div className="ch-hero-actions">
              <button
                id="hero-order-btn"
                className="ch-btn-hero-primary"
                onClick={() => navigate('/client/menu')}
              >
                <UtensilsCrossed size={18} strokeWidth={2.2} />
                <span>Khám Phá Thực Đơn</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </button>

              <button
                id="hero-scan-btn"
                className="ch-btn-hero-glass"
                onClick={() => navigate('/client/scan')}
              >
                <QrCode size={18} strokeWidth={2.2} />
                <span>Quét Mã Tại Bàn</span>
              </button>

              <button
                id="hero-reserve-btn"
                className="ch-btn-hero-glass"
                onClick={() => navigate('/client/reservation')}
              >
                <CalendarCheck size={18} strokeWidth={2.2} />
                <span>Đặt Bàn VIP</span>
              </button>
            </div>

            {/* Trust & Performance Metrics Bar */}
            <div className="ch-hero-stats">
              <div className="ch-stat-item">
                <div className="ch-stat-icon-wrap">
                  <Star size={16} color="#fbbf24" fill="#fbbf24" strokeWidth={2} />
                </div>
                <div>
                  <div className="ch-stat-val">4.9 / 5.0</div>
                  <div className="ch-stat-label">2,800+ Thực khách</div>
                </div>
              </div>

              <div className="ch-stat-item">
                <div className="ch-stat-icon-wrap">
                  <ChefHat size={17} color="#fb923c" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ch-stat-val">{totalDishesCount}+ Món</div>
                  <div className="ch-stat-label">Ba miền tuyển chọn</div>
                </div>
              </div>

              <div className="ch-stat-item">
                <div className="ch-stat-icon-wrap">
                  <Clock size={17} color="#34d399" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ch-stat-val">15 Phút</div>
                  <div className="ch-stat-label">Phục vụ nóng hổi</div>
                </div>
              </div>

              <div className="ch-stat-item">
                <div className="ch-stat-icon-wrap">
                  <ShieldCheck size={17} color="#38bdf8" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ch-stat-val">100% Sạch</div>
                  <div className="ch-stat-label">Chứng nhận VietGAP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2 — CULINARY PILLARS (Dịch Vụ & Trải Nghiệm Đẳng Cấp)
          ════════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-section--warm">
        <div className="ch-container">
          <div className="ch-section-header">
            <span className="ch-section-tag">
              <Sparkles size={13} strokeWidth={2.4} />
              <span>Giá Trị Cốt Lõi</span>
            </span>
            <h2 className="ch-section-title">
              Dịch Vụ Ẩm Thực Chuẩn Mực Doanh Nghiệp
            </h2>
            <p className="ch-section-desc">
              Kết hợp hoàn hảo giữa công thức gia truyền ba miền và tiêu chuẩn khắt khe về an toàn thực phẩm.
            </p>
          </div>

          <div className="ch-pillars-grid">
            <div className="ch-pillar-card">
              <div
                className="ch-pillar-icon-box"
                style={{ background: '#fff7ed', color: '#ea580c' }}
              >
                <Flame size={24} strokeWidth={2.2} />
              </div>
              <h3 className="ch-pillar-title">Ẩm Thực Độc Bản</h3>
              <p className="ch-pillar-desc">
                Công thức gia truyền độc quyền, ninh hầm nước dùng chậm suốt 24 giờ để tạo độ ngọt thanh tự nhiên từ xương tủy.
              </p>
            </div>

            <div className="ch-pillar-card">
              <div
                className="ch-pillar-icon-box"
                style={{ background: '#eff6ff', color: '#2563eb' }}
              >
                <CalendarCheck size={24} strokeWidth={2.2} />
              </div>
              <h3 className="ch-pillar-title">Đặt Chỗ & Phòng Riêng</h3>
              <p className="ch-pillar-desc">
                Hệ thống đặt bàn trực tuyến thông minh, giữ chỗ ưu tiên các vị trí view ngắm cảnh và phòng VIP tiệc riêng biệt.
              </p>
            </div>

            <div className="ch-pillar-card">
              <div
                className="ch-pillar-icon-box"
                style={{ background: '#f0fdf4', color: '#16a34a' }}
              >
                <Clock size={24} strokeWidth={2.2} />
              </div>
              <h3 className="ch-pillar-title">KDS Bếp Thông Minh 4.0</h3>
              <p className="ch-pillar-desc">
                Màn hình điều phối chế biến KDS tự động cân bằng tiến độ, đảm bảo các món ăn luôn lên bàn đúng thứ tự trong 15 phút.
              </p>
            </div>

            <div className="ch-pillar-card">
              <div
                className="ch-pillar-icon-box"
                style={{ background: '#fef3c7', color: '#d97706' }}
              >
                <ShieldCheck size={24} strokeWidth={2.2} />
              </div>
              <h3 className="ch-pillar-title">Nguồn Gốc Minh Bạch</h3>
              <p className="ch-pillar-desc">
                Nguyên liệu bò Wagyu, hải sản tươi sống và rau hữu cơ được thu hoạch mỗi sáng, truy xuất nguồn gốc rõ ràng 100%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 3 — SIGNATURE BESTSELLERS (Tuyển Tập Mỹ Vị Đặc Sắc)
          ════════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-section--surface">
        <div className="ch-container">
          <div className="ch-section-header">
            <span className="ch-section-tag">
              <Flame size={13} strokeWidth={2.4} />
              <span>Tuyển Chọn Bếp Trưởng</span>
            </span>
            <h2 className="ch-section-title">
              Món Ăn Được Yêu Thích Nhất
            </h2>
            <p className="ch-section-desc">
              Những kiệt tác hương vị được hàng nghìn thực khách lựa chọn và đánh giá xuất sắc nhất tại OmniResto.
            </p>
          </div>

          <div className="ch-dishes-grid">
            {displayDishes.map((item) => (
              <article
                key={item.id}
                className="ch-dish-card"
                onClick={() => navigate('/client/menu')}
              >
                <div className="ch-dish-img-wrap">
                  <img
                    src={item.image || '/images/food-placeholder.svg'}
                    alt={item.name}
                    className="ch-dish-img"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/images/food-placeholder.svg';
                    }}
                  />
                  <div className="ch-dish-badge">
                    <Flame size={11} strokeWidth={2.4} />
                    <span>Bán chạy</span>
                  </div>
                </div>

                <div className="ch-dish-body">
                  <div className="ch-dish-meta-row">
                    <span className="ch-dish-cat">{item.category}</span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Signature</span>
                  </div>

                  <h3 className="ch-dish-name">{item.name}</h3>
                  <p className="ch-dish-desc">{item.description}</p>

                  <div className="ch-dish-footer">
                    <span className="ch-dish-price">
                      {item.base_price.toLocaleString('vi-VN')}đ
                    </span>
                    <button
                      type="button"
                      className="ch-dish-order-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/client/menu');
                      }}
                    >
                      <Plus size={13} strokeWidth={2.4} />
                      <span>Chọn món</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              id="view-full-menu-btn"
              className="ch-btn-hero-primary"
              onClick={() => navigate('/client/menu')}
              style={{ padding: '12px 28px', fontSize: '0.9rem' }}
            >
              <span>Xem Toàn Bộ {totalDishesCount} Món Thực Đơn</span>
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 4 — DIGITAL DINING JOURNEY (Quy Trình Trải Nghiệm 4.0)
          ════════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-section--warm" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div className="ch-container">
          <div className="ch-journey-card">
            <div className="ch-journey-header">
              <span
                className="ch-section-tag"
                style={{ background: 'rgba(234, 88, 12, 0.2)', color: '#fb923c', borderColor: 'rgba(251, 146, 60, 0.4)' }}
              >
                <Sparkles size={13} strokeWidth={2.4} />
                <span>Trải Nghiệm Liền Mạch</span>
              </span>
              <h2 className="ch-section-title" style={{ color: '#ffffff' }}>
                Hành Trình Thưởng Thức Ẩm Thực 4.0
              </h2>
              <p className="ch-section-desc" style={{ color: '#94a3b8' }}>
                Từ lúc bước chân vào nhà hàng tới khi dùng bữa và rời bàn, mọi thao tác đều được tối ưu hóa chuẩn mực số.
              </p>
            </div>

            <div className="ch-journey-steps">
              <div className="ch-step-item">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ch-step-num-badge">1</div>
                  <QrCode size={22} color="#fb923c" strokeWidth={2} />
                </div>
                <h4 className="ch-step-title">Quét Mã QR Bàn Ăn</h4>
                <p className="ch-step-desc">
                  Thực khách ngồi vào bàn và quét mã QR tại bàn để kích hoạt phiên bàn ăn cá nhân hóa ngay trên điện thoại.
                </p>
              </div>

              <div className="ch-step-item">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ch-step-num-badge">2</div>
                  <Flame size={22} color="#fb923c" strokeWidth={2} />
                </div>
                <h4 className="ch-step-title">Theo Dõi Bếp Trực Tiếp</h4>
                <p className="ch-step-desc">
                  Đặt món theo từng đợt và theo dõi tiến độ từng món qua radar thời gian thực kết nối với nhà bếp.
                </p>
              </div>

              <div className="ch-step-item">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="ch-step-num-badge">3</div>
                  <CreditCard size={22} color="#fb923c" strokeWidth={2} />
                </div>
                <h4 className="ch-step-title">Thanh Toán Không Chờ Đợi</h4>
                <p className="ch-step-desc">
                  Hóa đơn chốt đóng băng số tiền để thanh toán VNPAY-QR tự động hoặc quẹt thẻ POS tức thì tại bàn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          ZONE 5 — CHEF PHILOSOPHY & FINAL VIP CTA
          ════════════════════════════════════════════════════════════ */}
      <section className="ch-section ch-section--surface" style={{ paddingTop: 20 }}>
        <div className="ch-container">
          <div className="ch-quote-card">
            <div className="ch-quote-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80"
                alt="Bếp trưởng điều hành OmniResto"
              />
            </div>
            <div className="ch-quote-content">
              <Quote size={28} className="ch-quote-mark" />
              <blockquote className="ch-quote-text">
                &ldquo;Ẩm thực không đơn thuần là sự thỏa mãn vị giác, mà là bản giao hưởng kết nối ký ức văn hóa dân tộc,
                nguyên liệu thuần khiết và sự trân quý chân thành dành cho mỗi thực khách.&rdquo;
              </blockquote>
              <div className="ch-quote-author-block">
                <div className="ch-quote-author-name">
                  <span>Lê Minh Tuấn</span>
                  <span className="ch-quote-author-badge">
                    <Award size={13} strokeWidth={2.2} />
                    Executive Chef
                  </span>
                </div>
                <div className="ch-quote-author-title">
                  Tổng Bếp Trưởng Điều Hành OmniResto
                </div>
              </div>
            </div>
          </div>

          <div className="ch-bottom-cta">
            <h3 className="ch-bottom-cta-title">
              Sẵn Sàng Trải Nghiệm Bữa Tiệc Ẩm Thực Thượng Hạng?
            </h3>
            <p className="ch-bottom-cta-desc">
              Đặt bàn trước để nhận vị trí view đẹp nhất cùng ưu đãi hội viên độc quyền từ OmniResto ngay hôm nay.
            </p>
            <div className="ch-bottom-cta-btns">
              <button
                className="ch-btn-hero-primary"
                onClick={() => navigate('/client/reservation')}
              >
                <CalendarCheck size={18} strokeWidth={2.2} />
                <span>Đặt Bàn VIP Trực Tuyến</span>
              </button>
              <button
                className="ch-btn-hero-glass"
                style={{ background: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
                onClick={() => navigate('/client/menu')}
              >
                <UtensilsCrossed size={18} strokeWidth={2.2} />
                <span>Khám Phá Menu</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClientHome;
