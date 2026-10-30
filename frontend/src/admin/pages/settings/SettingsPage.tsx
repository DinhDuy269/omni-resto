import React, { useState } from 'react';
import { actionLogApi } from '../../../shared/api/actionLogApi';
import {
  Store,
  Wifi,
  Receipt,
  Bot,
  Save,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'WIFI' | 'PAYMENT' | 'TAX' | 'AI'>('GENERAL');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const SETTINGS_STORAGE_KEY = 'omniresto_hq_settings';

  const defaultSettings = {
    brandName: 'OmniResto',
    hotline: '1900 6868',
    address: '123 Đường Ẩm Thực, Quận 1, TP. Hồ Chí Minh',
    wifiSsid: 'OmniResto_Guest',
    wifiPassword: 'OmniRestoGuest2026',
    vatRate: 8,
    serviceCharge: 0,
    bankId: 'MB',
    bankName: 'MBBank (Quân Đội)',
    accountNumber: '0368295264',
    accountName: 'NHAN HANG OMNIRESTO',
    vnpayTmnCode: 'CGXZLS0Z',
    vnpayHashSecret: 'XNBCJFAKAZQSGZSABUSXM9QMV8FVOEZM',
    geminiModel: 'gemini-3.6-flash',
    geminiRateLimit: 15,
  };

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(form));
      actionLogApi.record({ screen: 'Cấu Hình Hệ Thống', feature: 'Lưu cấu hình', action: 'Cập nhật cấu hình hệ thống: Phân mục [' + activeTab + ']' }).catch(() => {});
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      alert('Không thể lưu cài đặt vào bộ nhớ hệ thống.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── UNIFIED PAGE HEADER ── */}
      <div className="adm-page-header">
        <div>
          <div className="adm-header-badge-row">
            <span className="adm-badge-category">
              <Store size={13} /> THIẾT LẬP THƯƠNG HIỆU & HỆ THỐNG HQ
            </span>
          </div>
          <h1 className="adm-page-title">Cấu Hình Hệ Thống HQ</h1>
          <p className="adm-page-subtitle">
            Thiết lập chính sách toàn chuỗi: Thuế VAT, Cổng thanh toán VNPAY, Wifi khách và Trợ lý AI
          </p>
        </div>

        <div className="adm-header-actions">
          <button
            className="adm-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
            onClick={handleSave}
          >
            <Save size={16} />
            <span>Lưu Cấu Hình HQ</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '14px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>Đã lưu toàn bộ cấu hình hệ thống thành công và đồng bộ tới tất cả các chi nhánh!</span>
        </div>
      )}

      {/* ── NAVIGATION TABS & FORM CONTAINER ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Side: Category Tabs */}
        <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
          {[
            { id: 'GENERAL', label: 'Thông Tin Thương Hiệu', icon: Store },
            { id: 'PAYMENT', label: 'Cổng Thanh Toán VNPAY', icon: CreditCard },
            { id: 'TAX', label: 'Thuế VAT & Phí Dịch Vụ', icon: Receipt },
            { id: 'WIFI', label: 'Wifi Khách (Guest Wifi)', icon: Wifi },
            { id: 'AI', label: 'Trợ Lý AI & Tải Phục Vụ', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'var(--primary-subtle)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-body)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Form Body */}
        <div className="card" style={{ padding: '28px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
          {activeTab === 'GENERAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Thông Tin Nhãn Hàng & Trụ Sở Trung Tâm
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Tên Thương Hiệu</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.brandName}
                    onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Hotline Toàn Chuỗi</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.hotline}
                    onChange={(e) => setForm({ ...form, hotline: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Địa Chỉ Trụ Sở HQ</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
          )}

          {activeTab === 'PAYMENT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Cấu Hình Cổng Thanh Toán Trực Tuyến VNPAY
              </h3>
              <div style={{ background: 'var(--primary-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                💳 <strong>Cổng thanh toán VNPAY:</strong> Hỗ trợ thanh toán VNPAY-QR, Thẻ ATM nội địa, Thẻ quốc tế Visa/Mastercard và Ví điện tử.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>VNPAY Terminal Code (TMN)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.vnpayTmnCode}
                    onChange={(e) => setForm({ ...form, vnpayTmnCode: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>VNPAY Hash Secret Key</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.vnpayHashSecret}
                    onChange={(e) => setForm({ ...form, vnpayHashSecret: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TAX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Chính Sách Thuế VAT & Phí Phục Vụ
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Thuế Suất VAT (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.vatRate}
                    onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Phí Phục Vụ Service Charge (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.serviceCharge}
                    onChange={(e) => setForm({ ...form, serviceCharge: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'WIFI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Mạng Wifi Khách Dùng Tại Chỗ (Guest Wifi)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Thông tin này sẽ tự động hiển thị trên chân trang hoặc màn hình gọi món sau khi khách quét mã QR tại bàn.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Tên Wifi (SSID)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.wifiSsid}
                    onChange={(e) => setForm({ ...form, wifiSsid: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Mật Khẩu Wifi</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.wifiPassword}
                    onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Trợ Lý Ảo Google Gemini AI & Giới Hạn Tải
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Mô Hình AI Khuyên Dùng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.geminiModel}
                    onChange={(e) => setForm({ ...form, geminiModel: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Giới Hạn Tối Đa (Lượt/Phút)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.geminiRateLimit}
                    onChange={(e) => setForm({ ...form, geminiRateLimit: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
