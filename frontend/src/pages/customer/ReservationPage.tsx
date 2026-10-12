import React, { useState, useEffect } from 'react';
import { reservationApi } from '../../api/reservationApi';
import { 
  Calendar, Users, Phone, User, Mail, 
  FileText, Search, CheckCircle2, Clock, AlertCircle,
  Armchair, ArrowLeft, Utensils
} from 'lucide-react';
import './ReservationPage.css';

interface TableItem {
  id: string;
  tableNo: string;
  capacity: number;
  status: string;
}

interface ReservationDetail {
  id: string;
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  partySize: number;
  reservationTime: string;
  status: string;
  tableId?: string | null;
  tableNo?: string | null;
  tableCapacity?: number | null;
  specialNotes?: string | null;
}

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
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đặt bàn không thành công!';
}

// Kiểm tra khung giờ đóng cửa hoặc nghỉ bếp ngay tại client
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
  const [currentView, setCurrentView] = useState<'tables' | 'form' | 'tracking'>('tables');
  
  const [tablesLoading, setTablesLoading] = useState<boolean>(true);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [successBooking, setSuccessBooking] = useState<ReservationDetail | null>(null);
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

  const [trackCode, setTrackCode] = useState<string>('');
  const [trackResult, setTrackResult] = useState<ReservationDetail | null>(null);
  const [trackError, setTrackError] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;
    const fetchTables = async () => {
      setTablesLoading(true);
      try {
        const res = await reservationApi.getTables();
        if (!isCancelled) {
          setTables(res.data || []);
        }
      } catch (err: unknown) {
        console.error('Không thể tải sơ đồ bàn:', extractErrorMessage(err));
      } finally {
        if (!isCancelled) setTablesLoading(false);
      }
    };
    fetchTables();
    return () => { isCancelled = true; };
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

    // Cảnh báo ngay nếu khách chọn giờ đóng cửa/nghỉ bếp
    if (name === 'reservationTime') {
      const closedReason = checkOperatingHoursClient(value);
      if (closedReason) {
        setErrorMsg(closedReason);
      } else {
        setErrorMsg('');
      }
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || loading) return;

    setErrorMsg('');

    // Kiểm tra giờ mở cửa
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

    setLoading(true);

    try {
      const fullDateTime = `${formData.reservationDate}T${formData.reservationTime}:00`;
      const tableNote = `[Khách chọn: Bàn ${selectedTable.tableNo} (${selectedTable.capacity} chỗ)]`;
      const combinedNotes = formData.specialNotes ? `${tableNote} - ${formData.specialNotes.trim()}` : tableNote;

      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: formData.customerEmail ? formData.customerEmail.trim() : null,
        partySize: Number(formData.partySize),
        reservationTime: fullDateTime,
        specialNotes: combinedNotes,
      };

      const res = await reservationApi.createOnline(payload);
      setSuccessBooking(res.data);

      try {
        const channel = new BroadcastChannel('omni_reservation_channel');
        channel.postMessage({ type: 'NEW_RESERVATION', data: res.data });
        channel.close();
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim() || loading) return;
    setLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await reservationApi.trackByCode(trackCode.trim());
      setTrackResult(res.data);
    } catch (err: unknown) {
      setTrackError(extractErrorMessage(err));
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

        <div className="res-tab-bar">
          <button
            type="button"
            onClick={() => { setCurrentView('tables'); setSuccessBooking(null); }}
            className={`res-tab-item ${currentView !== 'tracking' ? 'active' : ''}`}
          >
            Sơ Đồ Chọn Bàn
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('tracking')}
            className={`res-tab-item ${currentView === 'tracking' ? 'active' : ''}`}
          >
            Tra Cứu Mã Đặt Bàn
          </button>
        </div>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>{errorMsg}</span>
                    {errorMsg.includes('đang có đơn đặt bàn') && (
                      <span 
                        onClick={() => setCurrentView('tracking')}
                        style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Bấm vào đây để chuyển sang tra cứu đơn hiện tại →
                      </span>
                    )}
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

      {currentView === 'tracking' && (
        <div className="res-box res-form-card">
          <h2 className="box-heading text-center">Tra Cứu Tiến Độ Đặt Bàn</h2>
          <p className="box-subheading text-center">Nhập mã phiếu để kiểm tra xem bàn của bạn đã được xác nhận hay chưa</p>

          <form onSubmit={handleTrackSubmit} className="res-track-form">
            <input
              type="text"
              required
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value)}
              placeholder="Nhập mã phiếu (Ví dụ: RSV-ONL-1562)"
              className="res-field-input track-input-field"
            />
            <button type="submit" disabled={loading} className="res-btn-track">
              <Search size={16} /> {loading ? 'Đang tìm...' : 'Tra Cứu'}
            </button>
          </form>

          {trackError && <div className="res-error-banner">{trackError}</div>}

          {trackResult && (
            <div className="res-track-card">
              <div className="track-head">
                <div>
                  <span className="track-lbl">MÃ PHIẾU ĐẶT BÀN</span>
                  <div className="track-code">{trackResult.reservationCode}</div>
                </div>
                <div className={`status-badge-chip badge-${trackResult.status.toLowerCase()}`}>
                  {trackResult.status === 'PENDING' && 'Chờ xác nhận'}
                  {trackResult.status === 'CONFIRMED' && 'Đã xếp bàn'}
                  {trackResult.status === 'SEATED' && 'Đang dùng bữa'}
                  {trackResult.status === 'CANCELLED' && 'Đã hủy'}
                </div>
              </div>

              <div className="track-grid-info">
                <div>
                  <label>Khách hàng</label>
                  <strong>{trackResult.customerName}</strong>
                </div>
                <div>
                  <label>Số điện thoại</label>
                  <strong>{trackResult.customerPhone}</strong>
                </div>
                <div>
                  <label>Số khách</label>
                  <strong>{trackResult.partySize} người</strong>
                </div>
                <div>
                  <label>Thời gian dùng bữa</label>
                  <strong>{new Date(trackResult.reservationTime).toLocaleString('vi-VN')}</strong>
                </div>
                <div>
                  <label>Bàn phục vụ</label>
                  <strong>{trackResult.tableNo ? `Bàn ${trackResult.tableNo}` : 'Đang sắp xếp'}</strong>
                </div>
              </div>

              {trackResult.specialNotes && (
                <div className="track-note-box">
                  <label>Ghi chú:</label>
                  <p>{trackResult.specialNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}