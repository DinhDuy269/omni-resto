import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Phone, Mail, User, MessageSquare, CheckCircle, ChevronRight, Flame, AlertCircle } from 'lucide-react';
import { useAdminStore } from '../../../admin/store/adminStore';
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
  const { branches } = useAdminStore();
  const { addReservation } = useReservationStore();

  const activeBranches = branches.filter((b) => b.status === 'ACTIVE');

  // ─── Form state ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState('');

  const [form, setForm] = useState({
    branchId: activeBranches[0]?.id ?? 'br-01',
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
      const selectedBranch = activeBranches.find((b) => b.id === form.branchId);
      const newRes = await addReservation({
        branchId: form.branchId,
        branchName: selectedBranch?.name ?? 'OmniResto',
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

  const selectedBranch = activeBranches.find((b) => b.id === form.branchId);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)', padding: '24px',
      }}>
        <div className="c-animate-fade-up" style={{
          maxWidth: 520, width: '100%', textAlign: 'center',
          background: 'var(--c-surface)', borderRadius: 'var(--c-r-xl)',
          border: '1px solid var(--c-border)', padding: '56px 40px',
          boxShadow: 'var(--c-shadow-lg)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
          }}>
            <CheckCircle size={36} color="#fff" strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--c-text-main)', marginBottom: 12 }}>
            Đặt bàn thành công! 🎉
          </h1>
          <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
            Yêu cầu đặt bàn của bạn đã được ghi nhận.
          </p>
          <p style={{ color: 'var(--c-text-muted)', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 32 }}>
            Chúng tôi sẽ xác nhận qua số điện thoại <strong style={{ color: 'var(--c-text-main)' }}>{form.customerPhone}</strong> trong vòng 30 phút.
          </p>

          <div style={{
            background: 'var(--c-bg)', borderRadius: 'var(--c-r-lg)',
            border: '1px solid var(--c-border-light)', padding: '20px',
            marginBottom: 32, textAlign: 'left',
          }}>
            {[
              { icon: '🏪', label: 'Chi nhánh', value: selectedBranch?.name },
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
            <button className="c-btn c-btn-lg" style={{ background: 'transparent', border: '1.5px solid var(--c-border)', color: 'var(--c-text-main)' }}
              onClick={() => { setStep('details'); setForm({ ...form, customerName: '', customerPhone: '', notes: '' }); }}>
              Đặt bàn mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'var(--c-font)' }}>

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(18,8,2,0.82) 0%, rgba(18,8,2,0.5) 100%)' }} />
        <div style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <Flame size={14} /> Đặt bàn trực tuyến
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, color: '#fff', margin: 0, textAlign: 'center' }}>
            Đặt Bàn Tại OmniResto
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', margin: 0 }}>
            Xác nhận trong vòng 30 phút
          </p>
        </div>
      </section>

      {/* ── Step indicator ──────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex' }}>
          {[
            { key: 'details', label: '1. Thông tin' },
            { key: 'confirm', label: '2. Xác nhận' },
          ].map((s, i) => (
            <div key={s.key} style={{
              padding: '14px 0', flex: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: 600,
              color: step === s.key ? 'var(--c-primary)' : 'var(--c-text-muted)',
              borderBottom: `2.5px solid ${step === s.key ? 'var(--c-primary)' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main form area ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 64px' }}>

        {step === 'details' && (
          <div className="c-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Branch selector */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>1</span>
                Chọn chi nhánh
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeBranches.map((b) => (
                  <label key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderRadius: 'var(--c-r-md)', border: `1.5px solid ${form.branchId === b.id ? 'var(--c-primary)' : 'var(--c-border)'}`,
                    background: form.branchId === b.id ? 'rgba(232,93,38,0.06)' : 'var(--c-bg)',
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}>
                    <input type="radio" name="branch" value={b.id} checked={form.branchId === b.id}
                      onChange={() => setValue('branchId', b.id)} style={{ accentColor: 'var(--c-primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--c-text-main)' }}>{b.name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--c-text-muted)', marginTop: 2 }}>{b.address}</div>
                    </div>
                    {form.branchId === b.id && (
                      <CheckCircle size={18} color="var(--c-primary)" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Date / Time / Party */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>2</span>
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
                    value={form.reservationDate}
                    min={today}
                    onChange={(e) => setValue('reservationDate', e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.reservationDate ? 'var(--c-danger)' : 'var(--c-border)' }}
                  />
                  {errors.reservationDate && <p style={errStyle}>{errors.reservationDate}</p>}
                </div>

                {/* Party size */}
                <div>
                  <label style={labelStyle}>
                    <Users size={14} /> Số người <span style={{ color: 'var(--c-danger)' }}>*</span>
                  </label>
                  <select
                    value={form.partySize}
                    onChange={(e) => setValue('partySize', Number(e.target.value))}
                    style={inputStyle}
                  >
                    {PARTY_SIZES.map((n) => (
                      <option key={n} value={n}>{n} người</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label style={labelStyle}>
                  <Clock size={14} /> Giờ đặt bàn <span style={{ color: 'var(--c-danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setValue('reservationTime', t)}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--c-r-full)', fontSize: '0.875rem',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        border: `1.5px solid ${form.reservationTime === t ? 'var(--c-primary)' : 'var(--c-border)'}`,
                        background: form.reservationTime === t ? 'var(--c-primary)' : 'transparent',
                        color: form.reservationTime === t ? '#fff' : 'var(--c-text-main)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {errors.reservationTime && <p style={errStyle}>{errors.reservationTime}</p>}
              </div>
            </div>

            {/* Contact info */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--c-r-lg)', border: '1px solid var(--c-border)', padding: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>3</span>
                Thông tin liên hệ
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}><User size={14} /> Họ và tên <span style={{ color: 'var(--c-danger)' }}>*</span></label>
                  <input
                    placeholder="Nguyễn Văn A"
                    value={form.customerName}
                    onChange={(e) => setValue('customerName', e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.customerName ? 'var(--c-danger)' : 'var(--c-border)' }}
                  />
                  {errors.customerName && <p style={errStyle}>{errors.customerName}</p>}
                </div>
                <div>
                  <label style={labelStyle}><Phone size={14} /> Số điện thoại <span style={{ color: 'var(--c-danger)' }}>*</span></label>
                  <input
                    placeholder="0901 234 567"
                    value={form.customerPhone}
                    onChange={(e) => setValue('customerPhone', e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.customerPhone ? 'var(--c-danger)' : 'var(--c-border)' }}
                  />
                  {errors.customerPhone && <p style={errStyle}>{errors.customerPhone}</p>}
                </div>
                <div>
                  <label style={labelStyle}><Mail size={14} /> Email <span style={{ color: 'var(--c-text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                  <input
                    placeholder="email@example.com"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setValue('customerEmail', e.target.value)}
                    style={{ ...inputStyle, borderColor: errors.customerEmail ? 'var(--c-danger)' : 'var(--c-border)' }}
                  />
                  {errors.customerEmail && <p style={errStyle}>{errors.customerEmail}</p>}
                </div>
                <div>
                  <label style={labelStyle}><MessageSquare size={14} /> Ghi chú <span style={{ color: 'var(--c-text-muted)', fontWeight: 400 }}>(tuỳ chọn)</span></label>
                  <textarea
                    placeholder="Ví dụ: Cần ghế trẻ em, dị ứng hải sản, dịp sinh nhật..."
                    value={form.notes}
                    onChange={(e) => setValue('notes', e.target.value)}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                  />
                </div>
              </div>
            </div>

            <button id="reservation-continue-btn" className="c-btn c-btn-primary c-btn-lg" onClick={handleContinue}
              style={{ width: '100%', justifyContent: 'center' }}>
              Xem lại thông tin
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
                { icon: '🏪', label: 'Chi nhánh', value: selectedBranch?.name },
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

// ─── Shared inline styles ────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--c-text-main)',
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--c-r-md)',
  border: '1.5px solid var(--c-border)', background: 'var(--c-bg)',
  color: 'var(--c-text-main)', fontSize: '0.9375rem', fontFamily: 'var(--c-font)',
  outline: 'none', boxSizing: 'border-box',
};

const errStyle: React.CSSProperties = {
  margin: '6px 0 0', fontSize: '0.8125rem', color: 'var(--c-danger)',
};

export default ClientReservation;
