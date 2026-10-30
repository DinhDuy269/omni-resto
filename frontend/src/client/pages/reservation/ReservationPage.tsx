import React, { useState, useEffect } from 'react';
import { reservationApi, type TableItem, type ReservationItem } from '../../../shared/api/reservationApi';
import { 
  Users, Phone, User, Mail, 
  CheckCircle2, Clock, AlertCircle,
  Armchair, ArrowLeft, Utensils, PhoneCall,
  Sparkles, Calendar, ChevronRight
} from 'lucide-react';
import './ReservationPage.css';

interface BookingFormState {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  special_notes: string;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, any>;
    if (anyErr.response?.data?.message) return anyErr.response.data.message;
    if (anyErr.data?.message) return anyErr.data.message;
    if (anyErr.error_description) return anyErr.error_description;
    if (anyErr.message) return anyErr.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đặt bàn không thành công!';
}

function checkOperatingHoursClient(timeStr: string): string | null {
  if (!timeStr) return null;
  const [hStr, mStr] = timeStr.split(':');
  const totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

  const morningOpen = 6 * 60;       // 06:00
  const breakStart = 14 * 60 + 30;  // 14:30
  const breakEnd = 16 * 60 + 30;    // 16:30
  const eveningClose = 22 * 60;     // 22:00

  if (totalMinutes >= breakStart && totalMinutes < breakEnd) {
    return 'Giờ này nhà hàng đang trong Giờ Nghỉ Bếp (14:30 - 16:30), quý khách vui lòng chọn khung giờ khác!';
  }

  if (totalMinutes < morningOpen || totalMinutes >= eveningClose) {
    return 'Nhà hàng mở cửa đón khách từ 06:00 - 14:30 và 16:30 - 22:00, quý khách vui lòng chọn giờ trong khung hoạt động!';
  }

  return null;
}

export default function ReservationPage(): React.ReactElement {
  const [currentView, setCurrentView] = useState<'tables' | 'form'>('tables');
  
  const [tablesLoading, setTablesLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<ReservationItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [formData, setFormData] = useState<BookingFormState>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 2,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    special_notes: '',
  });

  const fetchTables = async () => {
    try {
      const res = await reservationApi.getTables();
      setTables(res.data || []);
    } catch (err: unknown) {
      console.error('Không thể tải sơ đồ bàn:', extractErrorMessage(err));
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('omni_reservation_channel');
      broadcastChannel.onmessage = () => {
        fetchTables();
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    const eventSource = new EventSource('http://localhost:8080/api/tables/reservations/subscribe');
    eventSource.onmessage = () => {
      fetchTables();
    };

    return () => {
      eventSource.close();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, []);

  const handleSelectTable = (table: TableItem) => {
    if (table.status?.toLowerCase() !== 'available') return;
    setSelectedTable(table);
    setFormData((prev) => ({
      ...prev,
      party_size: Math.min(prev.party_size, table.capacity),
    }));
    setErrorMsg('');
    setCurrentView('form');
  };

  const handlePhoneBlur = async () => {
    const cleanPhone = formData.customer_phone.trim().replace(/[\s.-]+/g, '');
    if (cleanPhone.length >= 10) {
      try {
        const hasActive = await reservationApi.checkActivePhone(cleanPhone);
        if (hasActive) {
          setErrorMsg('⚠️ Số điện thoại này hiện đang có đơn đặt bàn đang chờ phục vụ. Vui lòng kiểm tra lại!');
        } else if (errorMsg.includes('Số điện thoại này hiện đang có đơn')) {
          setErrorMsg('');
        }
      } catch {
        // Ignore network check error on blur
      }
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || loading) return;

    setErrorMsg('');

    const closedReason = checkOperatingHoursClient(formData.reservation_time);
    if (closedReason) {
      setErrorMsg(closedReason);
      return;
    }

    const cleanPhone = formData.customer_phone.trim().replace(/[\s.-]+/g, '');
    const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(cleanPhone)) {
      setErrorMsg('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động Việt Nam (10 chữ số)!');
      return;
    }

    try {
      const hasActive = await reservationApi.checkActivePhone(cleanPhone);
      if (hasActive) {
        setErrorMsg('⚠️ Số điện thoại này hiện đang có đơn đặt bàn đang chờ phục vụ. Vui lòng không đặt trùng lặp!');
        return;
      }
    } catch {
      // Allow backend validation fallback
    }

    setLoading(true);

    try {
      const fullDateTime = `${formData.reservation_date}T${formData.reservation_time}:00`;
      const tableName = selectedTable.table_no;
      const tableNote = `[Khách chọn: Bàn ${tableName} (${selectedTable.capacity} chỗ)]`;
      const combinedNotes = formData.special_notes 
        ? `${tableNote} - ${formData.special_notes.trim()}` 
        : tableNote;

      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_phone: cleanPhone,
        customer_email: formData.customer_email ? formData.customer_email.trim() : null,
        party_size: Number(formData.party_size),
        reservation_time: fullDateTime,
        table_id: selectedTable.id,
        special_notes: combinedNotes,
      };

      const res = await reservationApi.createOnline(payload);
      setSuccessBooking(res.data ?? null);

      fetchTables();

      try {
        const channel = new BroadcastChannel('omni_reservation_channel');
        channel.postMessage({ type: 'NEW_RESERVATION', data: res.data });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
      fetchTables();
    } finally {
      setLoading(false);
    }
  };

  const isAvail = (status: string) => status?.toLowerCase() === 'available';

  return (
    <div className="lux-res-wrapper">
      <div className="lux-res-container">
        {/* ── HERO BANNER THƯỢNG HẠNG ── */}
        <header className="lux-header-hero">
          <div className="lux-tagline-badge">
            <span className="lux-pulse-sparkle" />
            <Sparkles size={13} />
            <span>Trải Nghiệm Ẩm Thực Tinh Hoa</span>
          </div>
          <h1 className="lux-hero-title">
            Đặt Bàn & <span>Không Gian Riêng Tư</span>
          </h1>
          <p className="lux-hero-desc">
            Chọn vị trí ưng ý, cảm nhận phong vị tinh tế và dịch vụ chăm sóc chuẩn mực fine-dining tại OmniResto.
          </p>
        </header>

        {/* ── BANNER HOTLINE ĐOÀN ĐÔNG ── */}
        <section className="lux-hotline-bar">
          <div className="lux-hotline-left">
            <div className="lux-hotline-icon">
              <PhoneCall size={20} />
            </div>
            <div>
              <h4 className="lux-hotline-title">Quý khách tổ chức tiệc hoặc đi đoàn đông (&gt; 8 khách)?</h4>
              <p className="lux-hotline-desc">
                Liên hệ ngay hotline để bộ phận Maître d' sắp xếp cụm bàn ghép liền kề và thực đơn theo yêu cầu.
              </p>
            </div>
          </div>
          <a href="tel:02438259999" className="lux-hotline-cta">
            <Phone size={14} /> Hotline: 024 3825 9999
          </a>
        </section>

        {/* ── VIEW 1: SƠ ĐỒ CHỌN BÀN ĂN ── */}
        {currentView === 'tables' && (
          <main className="lux-card-panel">
            <div className="lux-panel-header">
              <div className="lux-panel-title-wrap">
                <h2>Sơ Đồ Bàn Trực Quan</h2>
                <p>Khám phá và chọn bàn tiệc trống phù hợp với quy mô thực khách của bạn</p>
              </div>

              <div className="lux-status-legend">
                <span className="lux-legend-item">
                  <span className="lux-dot lux-dot-avail" /> Bàn Trống (Sẵn sàng đặt)
                </span>
                <span className="lux-legend-item">
                  <span className="lux-dot lux-dot-busy" /> Đang Phục Vụ
                </span>
              </div>
            </div>

            {tablesLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <Clock className="spinning" size={32} style={{ margin: '0 auto 12px', color: '#d4af37' }} />
                <p>Đang chuẩn bị sơ đồ bàn ăn trực quan...</p>
              </div>
            ) : (
              <div className="lux-tables-matrix">
                {tables.map((t) => {
                  const available = isAvail(t.status);
                  const tableNo = t.table_no;

                  return (
                    <article
                      key={t.id}
                      onClick={() => handleSelectTable(t)}
                      className={`lux-table-tile ${available ? 'is-avail' : 'is-busy'}`}
                    >
                      <div className="lux-table-armchair">
                        <Armchair size={26} strokeWidth={2.2} />
                      </div>
                      <h3 className="lux-table-number">Bàn {tableNo}</h3>
                      <div className="lux-table-seats">
                        <Users size={14} />
                        <span>Sức chứa: <strong>{t.capacity} khách</strong></span>
                      </div>

                      <div className={`lux-table-badge ${available ? 'badge-lux-emerald' : 'badge-lux-ruby'}`}>
                        {available ? '● Bàn Sẵn Sàng' : '✕ Đang Có Khách'}
                      </div>

                      {available && (
                        <div className="lux-table-choose-cue">
                          <span>Chọn bàn này</span>
                          <ChevronRight size={13} />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* ── VIEW 2: FORM THÔNG TIN ĐẶT BÀN & THIỆP MỜI VIP ── */}
        {currentView === 'form' && selectedTable && (
          <main className="lux-card-panel lux-form-wrapper">
            {successBooking ? (
              <div className="lux-success-envelope">
                <div className="lux-success-crown">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="lux-success-title">Đặt Bàn Thành Công!</h2>
                <p className="lux-success-sub">
                  OmniResto đã ghi nhận yêu cầu đặt bàn và sẽ đón tiếp quý khách với chất lượng trọn vẹn nhất.
                </p>

                {/* VIP Dining Pass Card */}
                <div className="lux-vip-card">
                  <div className="lux-vip-code-label">MÃ PHIẾU ĐẶT BÀN VIP</div>
                  <div className="lux-vip-code-val">
                    {successBooking.reservation_code}
                  </div>

                  <div className="lux-vip-grid">
                    <div>
                      <span className="lux-vip-item-label">Bàn Danh Dự</span>
                      <div className="lux-vip-item-val">
                        Bàn {selectedTable.table_no}
                      </div>
                    </div>
                    <div>
                      <span className="lux-vip-item-label">Số Thực Khách</span>
                      <div className="lux-vip-item-val">{formData.party_size} Người</div>
                    </div>
                    <div>
                      <span className="lux-vip-item-label">Ngày Thưởng Thức</span>
                      <div className="lux-vip-item-val">
                        {new Date(formData.reservation_date).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div>
                      <span className="lux-vip-item-label">Thời Gian Đón Tiếp</span>
                      <div className="lux-vip-item-val">{formData.reservation_time}</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="lux-btn-submit"
                  style={{ maxWidth: 360, margin: '0 auto' }}
                  onClick={() => {
                    setSuccessBooking(null);
                    setSelectedTable(null);
                    setCurrentView('tables');
                    setFormData({
                      customer_name: '',
                      customer_phone: '',
                      customer_email: '',
                      party_size: 2,
                      reservation_date: new Date().toISOString().split('T')[0],
                      reservation_time: '19:00',
                      special_notes: '',
                    });
                    fetchTables();
                  }}
                >
                  ← Đặt Thêm Bàn Tiệc Khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div className="lux-form-top-nav">
                  <button
                    type="button"
                    onClick={() => setCurrentView('tables')}
                    className="lux-back-btn"
                  >
                    <ArrowLeft size={15} /> Đổi Bàn Ăn Khác
                  </button>

                  <div className="lux-selected-table-pill">
                    <Utensils size={15} color="#d4af37" />
                    <span>Vị trí: <strong>Bàn {selectedTable.table_no}</strong> (Tối đa {selectedTable.capacity} khách)</span>
                  </div>
                </div>

                {/* Timeline 3 Ca Ăn */}
                <div className="lux-shift-timeline">
                  <div className="lux-shift-card">
                    <div className="lux-shift-title">🌅 Ca Sáng</div>
                    <div className="lux-shift-time">06:00 - 10:30</div>
                  </div>
                  <div className="lux-shift-card">
                    <div className="lux-shift-title">☀️ Ca Trưa</div>
                    <div className="lux-shift-time">10:30 - 14:30</div>
                  </div>
                  <div className="lux-shift-card is-active">
                    <div className="lux-shift-title">🌙 Ca Tối</div>
                    <div className="lux-shift-time">16:30 - 22:00</div>
                  </div>
                </div>

                {errorMsg && (
                  <div className="lux-alert-error">
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="lux-input-group">
                  <label className="lux-label">
                    <User size={15} color="#d4af37" /> Họ & Tên Quý Khách *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Tuấn Anh"
                    className="lux-input-control"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  />
                </div>

                <div className="lux-grid-2col">
                  <div className="lux-input-group">
                    <label className="lux-label">
                      <Phone size={15} color="#d4af37" /> Số Điện Thoại Di Động *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912 345 678"
                      className="lux-input-control"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      onBlur={handlePhoneBlur}
                    />
                  </div>

                  <div className="lux-input-group">
                    <label className="lux-label">
                      <Users size={15} color="#d4af37" /> Số Lượng Khách (Tối đa {selectedTable.capacity}) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={selectedTable.capacity}
                      required
                      className="lux-input-control"
                      value={formData.party_size}
                      onChange={(e) => setFormData({ ...formData, party_size: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="lux-grid-2col">
                  <div className="lux-input-group">
                    <label className="lux-label">
                      <Calendar size={15} color="#d4af37" /> Ngày Dùng Bữa *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="lux-input-control"
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    />
                  </div>

                  <div className="lux-input-group">
                    <label className="lux-label">
                      <Clock size={15} color="#d4af37" /> Giờ Đến Dùng Bữa *
                    </label>
                    <input
                      type="time"
                      required
                      className="lux-input-control"
                      value={formData.reservation_time}
                      onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="lux-input-group">
                  <label className="lux-label">
                    <Mail size={15} color="#d4af37" /> Email Xác Nhận (Không bắt buộc)
                  </label>
                  <input
                    type="email"
                    placeholder="VD: khachhang@example.com"
                    className="lux-input-control"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  />
                </div>

                <div className="lux-input-group">
                  <label className="lux-label">
                    <Sparkles size={15} color="#d4af37" /> Yêu Cầu Đặc Biệt Cho Bàn Tiệc
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Hoa tươi kỉ niệm, ghế trẻ em, bàn nhìn ra cảnh đêm..."
                    className="lux-input-control"
                    value={formData.special_notes}
                    onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="lux-btn-submit"
                >
                  {loading ? (
                    <>
                      <Clock size={18} className="spinning" />
                      <span>Đang Khởi Tạo Đơn Đặt Bàn...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Xác Nhận Đặt Bàn Thượng Hạng</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </main>
        )}
      </div>
    </div>
  );
}