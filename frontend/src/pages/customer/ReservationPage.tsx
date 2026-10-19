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

export default function ReservationPage(): React.ReactElement {
  // 'tables' (Trang 1: Chọn bàn) | 'form' (Trang 2: Điền thông tin) | 'tracking' (Tra cứu mã)
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

  // Tải danh sách bàn
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

  // 1. Khi khách bấm chọn 1 bàn trống -> Chuyển sang màn hình Form
  const handleSelectTable = (table: TableItem) => {
    if (table.status?.toLowerCase() !== 'available') return;
    setSelectedTable(table);
    setFormData((prev) => ({
      ...prev,
      partySize: Math.min(prev.partySize || 2, table.capacity),
    }));
    setErrorMsg('');
    setCurrentView('form'); // Chuyển sang trang form
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 2. Gửi form đặt bàn
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const fullDateTime = `${formData.reservationDate}T${formData.reservationTime}:00`;
      const tableNote = `[Khách chọn: Bàn ${selectedTable.tableNo} (${selectedTable.capacity} chỗ)]`;
      const combinedNotes = formData.specialNotes ? `${tableNote} - ${formData.specialNotes}` : tableNote;

      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || null,
        partySize: Number(formData.partySize),
        reservationTime: fullDateTime,
        specialNotes: combinedNotes,
      };

      const res = await reservationApi.createOnline(payload);
      setSuccessBooking(res.data);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 3. Tra cứu mã đặt bàn
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
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
      {/* ── HEADER ── */}
      <div className="res-top-header">
        <h1 className="res-main-title">Đặt Bàn Trực Tuyến</h1>
        <p className="res-main-subtitle">Thưởng thức ẩm thực trọn vẹn trong không gian ấm cúng tại OmniResto</p>

        {/* Thanh chuyển đổi màn hình */}
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

      {/* ══════════════════════════════════════════════════════════════
          MÀN HÌNH 1: SƠ ĐỒ CHỌN BÀN
          ══════════════════════════════════════════════════════════════ */}
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

      {/* ══════════════════════════════════════════════════════════════
          MÀN HÌNH 2: FORM ĐIỀN THÔNG TIN ĐẶT BÀN
          ══════════════════════════════════════════════════════════════ */}
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
                onClick={() => {
                  setSuccessBooking(null);
                  setSelectedTable(null);
                  setCurrentView('tables');
                }}
                className="res-btn-submit"
                style={{ maxWidth: '280px', margin: '24px auto 0' }}
              >
                Đặt Thêm Bàn Khác
              </button>
            </div>
          ) : (
            <>
              {/* Thanh điều hướng quay lại & Thông tin bàn đã chọn */}
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
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
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
                      <Clock size={15} /> Giờ đến *
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
                  {loading ? 'Đang gửi yêu cầu...' : `Xác Nhận Đặt Bàn ${selectedTable.tableNo}`}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MÀN HÌNH 3: TRA CỨU MÃ ĐẶT BÀN
          ══════════════════════════════════════════════════════════════ */}
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
              <Search size={16} /> Tra Cứu
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