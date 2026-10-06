import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Phone, Mail, User, MessageSquare, CheckCircle, Flame, ChevronRight } from 'lucide-react';
import { useReservationStore } from '../../../admin/store/reservationStore';

// ─── Time slot options ────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Step = 'details' | 'confirm' | 'success';

const ClientReservation: React.FC = () => {
  const navigate = useNavigate();
  const { addReservation } = useReservationStore();

  // ─── Form state ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState('');

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    reservationDate: today,
    reservationTime: '19:00',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const setValue = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.customerName.trim()) e.customerName = 'Vui lòng nhập họ tên';
    if (!form.customerPhone.trim()) e.customerPhone = 'Vui lòng nhập số điện thoại';
    else if (!/^[0-9]{9,11}$/.test(form.customerPhone.replace(/\s/g, '')))
      e.customerPhone = 'Số điện thoại không hợp lệ';
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      e.customerEmail = 'Email không hợp lệ';
    if (!form.reservationDate) e.reservationDate = 'Vui lòng chọn ngày';
    if (!form.reservationTime) e.reservationTime = 'Vui lòng chọn giờ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (validate()) setStep('confirm');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const newRes = await addReservation({
        customerName: form.customerName,
        customerPhone: form.customerPhone.replace(/\s/g, ''),
        customerEmail: form.customerEmail || undefined,
        partySize: form.partySize,
        reservationDate: form.reservationDate,
        reservationTime: form.reservationTime,
        notes: form.notes || undefined,
        status: 'pending',
      });
      setConfirmedId(newRes.id);
      setStep('success');
    } catch (err) {
      console.error('Reservation submission failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)', padding: '24px',
      }}>
        <div className="c-animate-fade-up" style={{
          maxWidth: 520, width: '100%', textAlign: 'center',
          background: 'var(--c-surface)', border: '1px solid var(--c-border)',
          borderRadius: 'var(--c-r-xl)', padding: '48px 36px',
          boxShadow: 'var(--c-shadow-lg)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)', border: '2px solid #22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle size={38} color="#16a34a" strokeWidth={2.2} />
          </div>

          <h1 style={{
            fontFamily: 'var(--c-font-display)', fontStyle: 'italic',
            fontSize: '1.875rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 12px',
          }}>
            Đặt Bàn Thành Công!
          </h1>

          <p style={{ color: 'var(--c-text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 28 }}>
            Cảm ơn quý khách <strong>{form.customerName}</strong>.
            Chúng tôi sẽ xác nhận qua số điện thoại <strong style={{ color: 'var(--c-text-main)' }}>{form.customerPhone}</strong> trong vòng 30 phút.
          </p>

          <div style={{
            background: 'var(--c-bg)', borderRadius: 'var(--c-r-lg)',
            border: '1px solid var(--c-border-light)', padding: '20px',
            marginBottom: 32, textAlign: 'left',
          }}>
            {[
              { icon: '🏪', label: 'Địa điểm', value: 'Nhà Hàng OmniResto' },
              { icon: '👥', label: 'Số người', value: `${form.partySize} người` },
              { icon: '📅', label: 'Ngày', value: new Date(form.reservationDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { icon: '⏰', label: 'Giờ', value: form.reservationTime },
              { icon: '🎟️', label: 'Mã đặt bàn', value: confirmedId.toUpperCase() },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--c-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}>{row.icon} {row.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-main)' }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            <button className="c-btn c-btn-primary c-btn-lg" onClick={() => navigate('/client/menu')}>
              🍜 Xem thực đơn
            </button>
            <button className="c-btn c-btn-outline c-btn-md" onClick={() => navigate('/client')}>
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--c-font)', background: 'var(--c-bg)', minHeight: '100vh' }}>

      {/* ── Page Header Banner ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #180d05 0%, #2d1305 100%)',
        padding: '48px 24px 36px', textAlign: 'center', color: '#fff',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(232,93,38,0.25)', border: '1px solid rgba(232,93,38,0.4)',
          borderRadius: 'var(--c-r-full)', padding: '4px 14px', marginBottom: 12,
        }}>
          <Flame size={13} color="var(--c-accent)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Đặt bàn trực tuyến
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--c-font-display)', fontStyle: 'italic',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 600, margin: '0 0 8px',
        }}>
          Giữ Chỗ Tại OmniResto
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', margin: 0 }}>
          Trải nghiệm không gian ẩm thực sang trọng và chu đáo
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 28 }}>
          {[
            { key: 'details', label: '1. Thông tin đặt chỗ' },
            { key: 'confirm', label: '2. Xác nhận' },
          ].map((s) => (
            <div key={s.key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: step === s.key ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: step === s.key ? 700 : 400,
              fontSize: '0.875rem',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: step === s.key ? 'var(--c-primary)' : 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                {s.label[0]}
              </span>
              <span>{s.label.slice(3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main form area ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 64px' }}>

        {step === 'details' && (
          <div className="c-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Date / Time / Party */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>1</span>
                Thời gian & số người
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Date */}
                <div>
                  <label style={labelStyle}>
                    <Calendar size={14} /> Ngày đặt bàn <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={form.reservationDate}
                    onChange={(e) => setValue('reservationDate', e.target.value)}
                    style={inputStyle(Boolean(errors.reservationDate))}
                  />
                  {errors.reservationDate && <p style={errorStyle}>{errors.reservationDate}</p>}
                </div>

                {/* Party size */}
                <div>
                  <label style={labelStyle}>
                    <Users size={14} /> Số khách <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <select
                    value={form.partySize}
                    onChange={(e) => setValue('partySize', Number(e.target.value))}
                    style={inputStyle(false)}
                  >
                    {PARTY_SIZES.map((n) => (
                      <option key={n} value={n}>{n} người{n === 10 ? ' +' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time slot picker */}
              <div>
                <label style={labelStyle}>
                  <Clock size={14} /> Chọn giờ <span style={{ color: 'var(--c-danger)' }}>*</span>
                </label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                  gap: 8, marginTop: 8,
                }}>
                  {TIME_SLOTS.map((t) => {
                    const isSelected = form.reservationTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setValue('reservationTime', t)}
                        style={{
                          padding: '9px 0', textAlign: 'center',
                          borderRadius: 'var(--c-r-md)',
                          border: `1.5px solid ${isSelected ? 'var(--c-primary)' : 'var(--c-border)'}`,
                          background: isSelected ? 'var(--c-primary)' : 'var(--c-bg)',
                          color: isSelected ? '#fff' : 'var(--c-text-main)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.875rem',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {errors.reservationTime && <p style={errorStyle}>{errors.reservationTime}</p>}
              </div>
            </div>

            {/* Customer info */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>2</span>
                Thông tin liên hệ
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Full name */}
                <div>
                  <label style={labelStyle}>
                    <User size={14} /> Họ và tên <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={form.customerName}
                    onChange={(e) => setValue('customerName', e.target.value)}
                    style={inputStyle(Boolean(errors.customerName))}
                  />
                  {errors.customerName && <p style={errorStyle}>{errors.customerName}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>
                      <Phone size={14} /> Số điện thoại <span style={{ color: 'var(--c-danger)' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="0912 345 678"
                      value={form.customerPhone}
                      onChange={(e) => setValue('customerPhone', e.target.value)}
                      style={inputStyle(Boolean(errors.customerPhone))}
                    />
                    {errors.customerPhone && <p style={errorStyle}>{errors.customerPhone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>
                      <Mail size={14} /> Email <span style={{ color: 'var(--c-text-light)', fontSize: '0.75rem' }}>(không bắt buộc)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={form.customerEmail}
                      onChange={(e) => setValue('customerEmail', e.target.value)}
                      style={inputStyle(Boolean(errors.customerEmail))}
                    />
                    {errors.customerEmail && <p style={errorStyle}>{errors.customerEmail}</p>}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={labelStyle}>
                    <MessageSquare size={14} /> Yêu cầu đặc biệt <span style={{ color: 'var(--c-text-light)', fontSize: '0.75rem' }}>(không bắt buộc)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Bàn gần cửa sổ, tiệc sinh nhật, cần ghế trẻ em..."
                    value={form.notes}
                    onChange={(e) => setValue('notes', e.target.value)}
                    style={{ ...inputStyle(false), resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              id="reservation-continue-btn"
              type="button"
              className="c-btn c-btn-primary c-btn-lg"
              onClick={handleContinue}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Tiếp tục — Kiểm tra thông tin
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="c-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '28px' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--c-text-main)', margin: '0 0 24px' }}>
                📋 Xác nhận thông tin đặt bàn
              </h2>

              {[
                { icon: '🏪', label: 'Địa điểm', value: 'Nhà Hàng OmniResto' },
                { icon: '📅', label: 'Ngày', value: new Date(form.reservationDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                { icon: '⏰', label: 'Giờ', value: form.reservationTime },
                { icon: '👥', label: 'Số người', value: `${form.partySize} người` },
                { icon: '👤', label: 'Tên', value: form.customerName },
                { icon: '📞', label: 'Điện thoại', value: form.customerPhone },
                ...(form.customerEmail ? [{ icon: '📧', label: 'Email', value: form.customerEmail }] : []),
                ...(form.notes ? [{ icon: '📝', label: 'Ghi chú', value: form.notes }] : []),
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '12px 0', borderBottom: '1px solid var(--c-border-light)', gap: 16,
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>{row.icon} {row.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--c-text-main)', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 'var(--c-r-md)', padding: '14px 18px',
              fontSize: '0.875rem', color: '#15803d', lineHeight: 1.6,
            }}>
              ✅ Sau khi đặt, chúng tôi sẽ liên hệ xác nhận trong vòng <strong>30 phút</strong>. Vui lòng đến đúng giờ để bàn không bị hủy.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="c-btn c-btn-lg" onClick={() => setStep('details')}
                style={{ flex: 1, justifyContent: 'center', background: 'transparent', border: '1.5px solid var(--c-border)', color: 'var(--c-text-main)' }}>
                ← Sửa lại
              </button>
              <button id="reservation-confirm-btn" className="c-btn c-btn-primary c-btn-lg"
                disabled={submitting} onClick={handleConfirm}
                style={{ flex: 2, justifyContent: 'center' }}>
                {submitting ? '⏳ Đang xử lý...' : '✅ Xác nhận đặt bàn'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Shared inline styles ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: '0.8125rem', fontWeight: 700, color: 'var(--c-text-main)',
  marginBottom: 6,
};

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 'var(--c-r-md)',
  border: `1.5px solid ${hasError ? 'var(--c-danger)' : 'var(--c-border)'}`,
  background: 'var(--c-surface)', color: 'var(--c-text-main)',
  fontFamily: 'var(--c-font)', fontSize: '0.9375rem',
  outline: 'none', transition: 'border-color 0.15s',
});

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--c-danger)', marginTop: 4, margin: '4px 0 0',
};

export default ClientReservation;
