import React, { useState } from 'react';
import {
  Settings,
  Store,
  Wifi,
  Receipt,
  QrCode,
  Bot,
  Save,
  CheckCircle2,
  Shield,
  CreditCard,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'WIFI' | 'PAYMENT' | 'TAX' | 'AI'>('GENERAL');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [form, setForm] = useState({
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
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Cấu Hình Hệ Thống HQ
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Thiết lập chính sách toàn chuỗi: Thuế VAT, Cổng thanh toán VietQR & VNPAY, Wifi khách và Trợ lý AI
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
          onClick={handleSave}
        >
          <Save size={16} />
          <span>Lưu Cấu Hình HQ</span>
        </button>
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
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
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
        <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'GENERAL', label: 'Thông Tin Thương Hiệu', icon: Store },
            { id: 'PAYMENT', label: 'Cổng Thanh Toán (QR & VNPAY)', icon: CreditCard },
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
                  borderRadius: 'var(--radius-md)',
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
        <div className="card" style={{ padding: '28px' }}>
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
                Cấu Hình Cổng Thanh Toán VietQR & VNPAY
              </h3>
              <div style={{ background: 'var(--primary-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: '0.85rem', color: 'var(--primary)' }}>
                💳 <strong>VietQR MBBank:</strong> Tự động xuất mã QR động chuyển khoản ngân hàng gắn sẵn mã hóa đơn và số tiền.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Số Tài Khoản</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Tên Chủ Tài Khoản</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>Ngân Hàng Thụ Hưởng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-body)' }}>VNPAY Terminal Code (TMN)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.vnpayTmnCode}
                    onChange={(e) => setForm({ ...form, vnpayTmnCode: e.target.value })}
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
