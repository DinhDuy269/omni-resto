import React from 'react';
import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Award,
  ShieldCheck,
  QrCode,
  Clock,
  MapPin,
  Phone,
  Mail,
  Sparkles,
} from 'lucide-react';
import './ClientFooter.css';

const FOOTER_NAV_LINKS = [
  { to: '/client/menu', label: 'Thực đơn tinh tuyển' },
  { to: '/client/reservation', label: 'Đặt bàn & Phòng tiệc VIP' },
  { to: '/client/orders', label: 'Theo dõi bếp trực tiếp' },
  { to: '/client/gacha', label: 'Vòng quay may mắn' },
  { to: '/client/about', label: 'Câu chuyện thương hiệu' },
];

export const ClientFooter: React.FC = () => {

  return (
    <footer className="client-footer-root" role="contentinfo" aria-label="Thông tin liên hệ và chân trang">
      <div className="client-footer-glow" />

      <div className="client-footer-container">
        {/* ── ZONE 1: UPPER TRUST RIBBON ── */}
        <div className="client-footer-ribbon">
          <div className="ribbon-item">
            <div className="ribbon-icon-box">
              <Award size={20} strokeWidth={2} />
            </div>
            <div>
              <h4 className="ribbon-title">Tuyển Chọn Michelin Guide</h4>
              <p className="ribbon-desc">Tôn vinh tinh hoa ẩm thực đương đại ba miền</p>
            </div>
          </div>

          <div className="ribbon-item">
            <div className="ribbon-icon-box">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
              <h4 className="ribbon-title">100% Tiêu Chuẩn VietGAP</h4>
              <p className="ribbon-desc">Nguyên liệu hữu cơ thu hoạch tươi mới mỗi ngày</p>
            </div>
          </div>

          <div className="ribbon-item">
            <div className="ribbon-icon-box">
              <QrCode size={20} strokeWidth={2} />
            </div>
            <div>
              <h4 className="ribbon-title">Dịch Vụ Số Hóa 4.0</h4>
              <p className="ribbon-desc">Gọi món & thanh toán không tiếp xúc tức thì</p>
            </div>
          </div>

          <div className="ribbon-item">
            <div className="ribbon-icon-box">
              <Clock size={20} strokeWidth={2} />
            </div>
            <div>
              <h4 className="ribbon-title">Phục Vụ Nóng 15 Phút</h4>
              <p className="ribbon-desc">Điều phối bếp thông minh qua màn hình KDS</p>
            </div>
          </div>
        </div>

        {/* ── ZONE 2: MAIN 4-COLUMN GRID ── */}
        <div className="client-footer-grid">
          {/* Column 1: Brand & Philosophy */}
          <div className="footer-col-brand">
            <div className="footer-brand-header">
              <div className="footer-brand-logo-icon">
                <UtensilsCrossed size={22} strokeWidth={2.2} />
              </div>
              <div className="footer-brand-name-wrap">
                <span className="footer-brand-name">OmniResto</span>
                <span className="footer-brand-badge">Fine Dining & Culinary Arts</span>
              </div>
            </div>

            <p className="footer-brand-desc">
              Không gian ẩm thực giao thoa giữa nghệ thuật truyền thống Việt Nam và phong vị đương đại.
              Mỗi món ăn là một tác phẩm vị giác được chuẩn bị với lòng hiếu khách chân thành.
            </p>

            <div className="footer-social-cluster" aria-label="Mạng xã hội OmniResto">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                title="Theo dõi trên Facebook"
                aria-label="Facebook"
              >
                <svg className="footer-social-svg" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                title="Theo dõi trên Instagram"
                aria-label="Instagram"
              >
                <svg className="footer-social-svg" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                title="Theo dõi trên TikTok"
                aria-label="TikTok"
              >
                <svg className="footer-social-svg" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.55c.02 2.05-.72 4.13-2.13 5.64-1.71 1.83-4.28 2.79-6.76 2.5-2.77-.28-5.26-2.1-6.3-4.69-1.18-2.85-.59-6.37 1.49-8.62 1.68-1.84 4.25-2.76 6.74-2.42v4.11c-1.3-.23-2.7.13-3.64 1.05-.98.94-1.33 2.4-1 3.7.35 1.34 1.55 2.37 2.94 2.53 1.57.19 3.19-.66 3.84-2.1.28-.6.38-1.28.38-1.95V.02z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-btn"
                title="Đăng ký kênh YouTube"
                aria-label="YouTube"
              >
                <svg className="footer-social-svg" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-col-nav">
            <h4 className="footer-col-title">
              <span className="footer-col-title-accent" />
              Khám Phá
            </h4>
            <ul className="footer-nav-list">
              {FOOTER_NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-nav-link">
                    <span className="footer-nav-bullet" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact & Locations */}
          <div className="footer-col-contact">
            <h4 className="footer-col-title">
              <span className="footer-col-title-accent" />
              Hệ Thống & Đặt Tiệc
            </h4>
            <div className="footer-contact-list">
              <div className="footer-contact-item">
                <MapPin size={16} className="footer-contact-icon" />
                <span>42 Tràng Tiền, Q. Hoàn Kiếm, TP. Hà Nội</span>
              </div>

              <div className="footer-contact-item">
                <MapPin size={16} className="footer-contact-icon" />
                <span>88 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM</span>
              </div>

              <div className="footer-contact-item">
                <Clock size={16} className="footer-contact-icon" />
                <span>
                  <strong className="footer-numeric-val">10:30 – 22:30</strong> (Tất cả các ngày, kể cả Lễ Tết)
                </span>
              </div>

              <div className="footer-contact-item">
                <Phone size={16} className="footer-contact-icon" />
                <span>
                  Hotline đặt tiệc:{' '}
                  <a href="tel:02438259999" className="footer-contact-link footer-numeric-val">
                    024 3825 9999
                  </a>
                </span>
              </div>

              <div className="footer-contact-item">
                <Mail size={16} className="footer-contact-icon" />
                <span>
                  Dịch vụ VIP:{' '}
                  <a href="mailto:concierge@omniresto.vn" className="footer-contact-link">
                    concierge@omniresto.vn
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Culinary Experience & Services */}
          <div className="footer-col-newsletter">
            <h4 className="footer-col-title">
              <span className="footer-col-title-accent" />
              Trải Nghiệm Đẳng Cấp
            </h4>

            <div className="footer-newsletter-card">
              <p className="footer-newsletter-desc">
                Trải nghiệm gọi món không chạm qua mã QR tại bàn, tư vấn món ngon cá nhân hóa cùng AI Sommelier và thanh toán VietQR tức thì.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  to="/client/menu"
                  className="footer-newsletter-btn"
                  style={{ textDecoration: 'none' }}
                  title="Khám phá thực đơn"
                >
                  <Sparkles size={16} strokeWidth={2.2} />
                  <span>Khám Phá Thực Đơn</span>
                </Link>
                <Link
                  to="/client/reservation"
                  className="footer-newsletter-btn"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                  }}
                  title="Đặt bàn trước"
                >
                  <Clock size={16} strokeWidth={2.2} />
                  <span>Đặt Bàn Trực Tuyến</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── ZONE 3: BOTTOM LEGAL & STATUS BAR ── */}
        <div className="client-footer-bottom">
          <div className="footer-bottom-inner">
            <div className="footer-copyright">
              © {new Date().getFullYear()} <strong style={{ color: '#f1f5f9' }}>OmniResto Culinary Group</strong>. All rights reserved.
            </div>

            <div className="footer-legal-links">
              <Link to="/client/about" className="footer-legal-link">
                Điều khoản dịch vụ
              </Link>
              <span>·</span>
              <Link to="/client/about" className="footer-legal-link">
                Chính sách bảo mật
              </Link>
              <span>·</span>
              <Link to="/client/about" className="footer-legal-link">
                Tiêu chuẩn vệ sinh ATTP
              </Link>
            </div>

            <div className="footer-status-pill">
              <span className="status-dot-pulse" aria-hidden="true" />
              <span>Bảo mật SSL/TLS 1.3 · Vận hành 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
