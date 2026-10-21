import React, { useState, useEffect } from 'react';
import { reservationApi, type TableItem, type ReservationItem } from '../../api/reservationApi';
import { 
  Calendar, Users, Phone, User, Mail, 
  FileText, CheckCircle2, Clock, AlertCircle,
  Armchair, ArrowLeft, Utensils
} from 'lucide-react';
import './ReservationPage.css';

interface BookingFormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  specialNotes: string;
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
  const [hStr, mStr] = timeStr.split(':');
  const totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

  const morningOpen = 6 * 60;       // 06:00
  const breakStart = 14 * 60 + 30;  // 14:30
  const breakEnd = 16 * 60 + 30;    // 16:30
  const eveningClose = 22 * 60;     // 22:00

  if (totalMinutes >= breakStart && totalMinutes < breakEnd) {
    return 'Giờ này nhà hàng đang trong Giờ Nghỉ Bếp (14:30 - 16:30), bạn hãy đặt vào giờ khác!';
  }

  if (totalMinutes < morningOpen || totalMinutes >= eveningClose) {
    return 'Giờ này nhà hàng đang Đóng Cửa (22:00 - 06:00), bạn hãy đặt vào giờ khác (06:00 - 14:30 hoặc 16:30 - 22:00)!';
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
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '19:00',
    specialNotes: '',
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
    const initTimer = setTimeout(() => {
      fetchTables();
    }, 0);

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

    eventSource.addEventListener('NEW_RESERVATION', () => {
      fetchTables();
    });

    eventSource.addEventListener('UPDATE_RESERVATION', () => {
      fetchTables();
    });

    return () => {
      clearTimeout(initTimer);
      eventSource.close();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, []);

  const handleSelectTable = (table: TableItem) => {
    if (table.status?.toLowerCase() !== 'available') return;
    setSelectedTable(table);
    setFormData((prev) => ({
      ...prev,
      partySize: Math.min(prev.partySize || 2, table.capacity),
    }));
    setErrorMsg('');
    setCurrentView('form');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'reservationTime') {
      const closedReason = checkOperatingHoursClient(value);
      if (closedReason) {
        setErrorMsg(closedReason);
      } else {
        setErrorMsg('');
      }
    }

    if (name === 'customerPhone' && errorMsg.includes('Số điện thoại')) {
      setErrorMsg('');
    }
  };

  const handlePhoneBlur = async () => {
    const cleanPhone = formData.customerPhone.trim().replace(/[\s.-]+/g, '');
    const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    
    if (vnPhoneRegex.test(cleanPhone)) {
      try {
        const hasActive = await reservationApi.checkActivePhone(cleanPhone);
        if (hasActive) {
          setErrorMsg('⚠️ Số điện thoại này hiện đang có đơn đặt bàn chưa hoàn tất. Vui lòng không đặt trùng lặp!');
        } else if (errorMsg.includes('Số điện thoại này hiện đang có đơn')) {
          setErrorMsg('');
        }
      } catch {
        // Bỏ qua lỗi kết nối ở bước blur
      }
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || loading) return;

    setErrorMsg('');

    const closedReason = checkOperatingHoursClient(formData.reservationTime);
    if (closedReason) {
      setErrorMsg(closedReason);
      return;
    }

    const cleanPhone = formData.customerPhone.trim().replace(/[\s.-]+/g, '');
    const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!vnPhoneRegex.test(cleanPhone)) {
      setErrorMsg('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại di động hợp lệ tại Việt Nam (10 chữ số)!');
      return;
    }

    try {
      const hasActive = await reservationApi.checkActivePhone(cleanPhone);
      if (hasActive) {
        setErrorMsg('⚠️ Số điện thoại này hiện đang có đơn đặt bàn chưa hoàn tất. Vui lòng không đặt trùng lặp!');
        return;
      }
    } catch {
      // Tiếp tục để backend kiểm tra nếu bước check trước đó gặp sự cố mạng
    }

    setLoading(true);

    try {
      const fullDateTime = `${formData.reservationDate}T${formData.reservationTime}:00`;
      const tableNote = `[Khách chọn: Bàn ${selectedTable.tableNo} (${selectedTable.capacity} chỗ)]`;
      const combinedNotes = formData.specialNotes 
        ? `${tableNote} - ${formData.specialNotes.trim()}` 
        : tableNote;

      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: formData.customerEmail ? formData.customerEmail.trim() : null,
        partySize: Number(formData.partySize),
        reservationTime: fullDateTime,
        tableId: selectedTable.id,
        specialNotes: combinedNotes,
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
    <div className="res-container">
      <div className="res-top-header">
        <h1 className="res-main-title">Đặt Bàn Trực Tuyến</h1>
        <p className="res-main-subtitle">Thưởng thức ẩm thực trọn vẹn trong không gian ấm cúng tại OmniResto</p>
      </div>

      {currentView === 'tables' && (
        <div className="res-box">
          <div className="table-selection-header">
            <div>
              <h2 className="box-heading">Chọn Bàn Còn Trống</h2>
              <p className="box-subheading">Bấm vào bàn trống bạn muốn ngồi để tiến hành đăng ký</p>
            </div>
            <div className="table-legend">
              <span className="legend-tag legend-tag--avail">
                <span className="status-dot dot-green"></span> Bàn trống (Chọn được)
              </span>
              <span className="legend-tag legend-tag--busy">
                <span className="status-dot dot-red"></span> Đang có khách
              </span>
            </div>
          </div>

          {tablesLoading ? (
            <div className="res-loading-state">
              <div className="res-spinner"></div>
              <p>Đang tải sơ đồ bàn ăn...</p>
            </div>
          ) : (
            <div className="tables-layout-grid">
              {tables.map((t) => {
                const available = isAvail(t.status);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    className={`grid-table-card ${available ? 'is-available' : 'is-occupied'}`}
                  >
                    <div className="card-table-icon">
                      <Armchair size={26} />
                    </div>
                    <h3 className="card-table-title">Bàn {t.tableNo}</h3>
                    <span className="card-table-cap">Sức chứa: {t.capacity} khách</span>
                    
                    <div className={`card-table-badge ${available ? 'badge-green' : 'badge-gray'}`}>
                      {available ? '🟢 Bàn Trống' : '🔴 Có Khách'}
                    </div>

                    {available && (
                      <span className="card-table-action">Chọn bàn này →</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {currentView === 'form' && selectedTable && (
        <div className="res-box res-form-card">
          {successBooking ? (
            <div className="res-success-view">
              <CheckCircle2 className="success-badge-icon" />
              <h2 className="success-headline">Đặt Bàn Thành Công!</h2>
              <p className="success-sub">Mã phiếu đặt bàn của bạn là:</p>
              
              <div className="success-code-token">{successBooking.reservationCode}</div>

              <div className="success-details-summary">
                <span>📍 Bàn đã chọn: <strong>Bàn {selectedTable.tableNo}</strong></span>
                <span>👥 Số lượng: <strong>{formData.partySize} khách</strong></span>
                <span>⏰ Thời gian: <strong>{formData.reservationTime} - {formData.reservationDate}</strong></span>
              </div>

              <p className="success-note-text">
                Nhân viên nhà hàng sẽ kiểm tra và liên hệ xác nhận bàn cho bạn trong thời gian sớm nhất.
              </p>

              <button
                type="button"
                className="res-btn-submit"
                style={{ marginTop: 20 }}
                onClick={() => {
                  setSuccessBooking(null);
                  setSelectedTable(null);
                  setCurrentView('tables');
                  setFormData({
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    partySize: 2,
                    reservationDate: new Date().toISOString().split('T')[0],
                    reservationTime: '19:00',
                    specialNotes: '',
                  });
                  fetchTables();
                }}
              >
                ← Quay lại đặt thêm bàn khác
              </button>
            </div>
          ) : (
            <>
              <div className="form-card-topbar">
                <button
                  type="button"
                  onClick={() => setCurrentView('tables')}
                  className="res-back-btn"
                >
                  <ArrowLeft size={16} /> Đổi Bàn Khác
                </button>

                <div className="chosen-table-pill">
                  <Utensils size={15} />
                  <span>Đang đặt: <strong>Bàn {selectedTable.tableNo}</strong> (Tối đa {selectedTable.capacity} khách)</span>
                </div>
              </div>

              <div className="form-card-title-group">
                <h2 className="box-heading">Thông Tin Đặt Bàn</h2>
                <p className="box-subheading">Vui lòng điền thông tin để chúng tôi chuẩn bị đón tiếp chu đáo nhất</p>
              </div>

              {errorMsg && (
                <div className="res-error-banner">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="res-styled-form">
                <div className="res-form-2col">
                  <div className="res-field-group">
                    <label className="res-field-label">
                      <User size={15} /> Họ và tên *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      required
                      value={formData.customerName}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="res-field-input"
                    />
                  </div>

                  <div className="res-field-group">
                    <label className="res-field-label">
                      <Phone size={15} /> Số điện thoại *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      required
                      value={formData.customerPhone}
                      onChange={handleChange}
                      onBlur={handlePhoneBlur}
                      placeholder="0988111222"
                      className="res-field-input"
                    />
                  </div>

                  <div className="res-field-group">
                    <label className="res-field-label">
                      <Mail size={15} /> Email (nếu có)
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      placeholder="example@gmail.com"
                      className="res-field-input"
                    />
                  </div>

                  <div className="res-field-group">
                    <label className="res-field-label">
                      <Users size={15} /> Số lượng khách *
                    </label>
                    <input
                      type="number"
                      name="partySize"
                      min="1"
                      max={selectedTable.capacity}
                      required
                      value={formData.partySize}
                      onChange={handleChange}
                      className="res-field-input"
                    />
                    <small className="field-hint">Tối đa {selectedTable.capacity} người theo sức chứa của bàn</small>
                  </div>

                  <div className="res-field-group">
                    <label className="res-field-label">
                      <Calendar size={15} /> Ngày dùng bữa *
                    </label>
                    <input
                      type="date"
                      name="reservationDate"
                      required
                      value={formData.reservationDate}
                      onChange={handleChange}
                      className="res-field-input"
                    />
                  </div>

                  <div className="res-field-group">
                    <label className="res-field-label">
                      <Clock size={15} /> Giờ đến (Mở: 06:00-14:30 & 16:30-22:00) *
                    </label>
                    <input
                      type="time"
                      name="reservationTime"
                      required
                      value={formData.reservationTime}
                      onChange={handleChange}
                      className="res-field-input"
                    />
                  </div>
                </div>

                <div className="res-field-group">
                  <label className="res-field-label">
                    <FileText size={15} /> Yêu cầu đặc biệt (tùy chọn)
                  </label>
                  <textarea
                    name="specialNotes"
                    rows={3}
                    value={formData.specialNotes}
                    onChange={handleChange}
                    placeholder="Ví dụ: Bàn tiệc sinh nhật, ghế ăn cho trẻ em..."
                    className="res-field-textarea"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="res-btn-submit"
                >
                  {loading ? 'Đang kiểm tra & xử lý...' : `Xác Nhận Đặt Bàn ${selectedTable.tableNo}`}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}