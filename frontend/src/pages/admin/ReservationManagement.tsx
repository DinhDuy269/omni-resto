import React, { useState, useEffect, useCallback } from 'react';
import { reservationApi } from '../../api/reservationApi';
import { 
  Plus, 
  RefreshCw, 
  Armchair, 
  Search, 
  LayoutGrid, 
  ListFilter, 
  Clock, 
  User,
  Volume2,
  X
} from 'lucide-react';
import './ReservationManagement.css';

interface TableItem {
  id: string;
  tableNo: string;
  capacity: number;
  status: string;
}

interface ReservationItem {
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
  createdAt?: string;
  updatedAt?: string;
}

interface AssignModalState {
  isOpen: boolean;
  reservation: ReservationItem | null;
  selectedTableId: string;
}

interface OfflineFormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  tableId: string;
  specialNotes: string;
  seatedImmediately: boolean;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã có lỗi xảy ra!';
}

// 1. HÀM ĐỌC TIẾNG VIỆT ĐẶT Ở NGOÀI COMPONENT
// Hàm đọc thông báo tiếng Việt chuẩn phát thanh, rành mạch từng chữ
function speakReservationAlert(customerName: string, partySize: number, note?: string | null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    // 1. Ngắt ngay câu đọc cũ (nếu có) để phát thông báo mới
    window.speechSynthesis.cancel();

    // 2. Xử lý chuẩn hóa tên bàn để đọc đúng ngữ âm tiếng Việt
    let tableSpeech = '';
    if (note && note.includes('Khách chọn:')) {
      const match = note.match(/Khách chọn:\s*(Bàn\s*[A-Za-z0-9_-]+)/i);
      if (match) {
        // Đổi "T-09" hoặc "T-10" thành "Tê 9", "Tê 10" để phát âm chuẩn tiếng Việt
        let rawTable = match[1].trim();
        rawTable = rawTable.replace(/T-0?/i, 'Tê '); // Chuyển chữ T thành Tê và bỏ số 0 thừa
        tableSpeech = `. Tại ${rawTable}`;
      }
    }

    // 3. Câu đọc có ngắt nghỉ câu bằng dấu chấm, nhịp đọc mạch lạc
    const textToRead = `Thông báo! Có đơn đặt bàn mới. Khách hàng: ${customerName}. Số lượng: ${partySize} người${tableSpeech}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.88; // Tốc độ vừa phải, dứt khoát, nghe rõ trong môi trường ồn
    utterance.pitch = 1.02; // Cao độ tự nhiên
    utterance.volume = 1.0; // Âm lượng tối đa

    // 4. Tìm kiếm và ưu tiên giọng tiếng Việt chuẩn/tự nhiên nhất của máy
    const voices = window.speechSynthesis.getVoices();
    const viVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('vi') ||
        v.name.toLowerCase().includes('vietnam') ||
        v.name.toLowerCase().includes('tiếng việt')
    );

    if (viVoices.length > 0) {
      // Ưu tiên theo thứ tự: Giọng Natural/Neural -> Microsoft HoaiMy -> Google Tiếng Việt -> Giọng Việt bất kỳ
      const bestVoice =
        viVoices.find((v) => v.name.includes('Natural') || v.name.includes('Neural')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('hoaimy')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('google')) ||
        viVoices[0];

      utterance.voice = bestVoice;
    }

    // 5. Phát giọng nói
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}
// 2. COMPONENT CHÍNH
export default function ReservationManagement(): React.ReactElement {
  const [activeMode, setActiveMode] = useState<'map' | 'list'>('map');

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [toastAlert, setToastAlert] = useState<ReservationItem | null>(null);

  const [assignModal, setAssignModal] = useState<AssignModalState>({
    isOpen: false,
    reservation: null,
    selectedTableId: '',
  });

  const [offlineModal, setOfflineModal] = useState<boolean>(false);
  const [offlineForm, setOfflineForm] = useState<OfflineFormState>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '19:00',
    tableId: '',
    specialNotes: '',
    seatedImmediately: false,
  });

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [resData, tablesData] = await Promise.all([
        reservationApi.getAll(filterStatus),
        reservationApi.getTables(),
      ]);
      setReservations(resData.data || []);
      setTables(tablesData.data || []);
    } catch (err: unknown) {
      console.error('Lỗi nạp dữ liệu:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const handleIncomingNewReservation = useCallback((incoming: ReservationItem) => {
    setReservations((prev) => {
      if (prev.some((r) => r.id === incoming.id)) {
        return prev;
      }
      return [incoming, ...prev];
    });

    reservationApi.getTables().then((t) => setTables(t.data || []));

    // Đọc thông báo tiếng Việt
    speakReservationAlert(incoming.customerName, incoming.partySize, incoming.specialNotes);

    // Bật Toast góc phải
    setToastAlert(incoming);
    setTimeout(() => {
      setToastAlert((curr) => (curr?.id === incoming.id ? null : curr));
    }, 8000);
  }, []);

  // 👇 ĐÂY LÀ NƠI ĐẶT useEffect (NẰM TRONG THÂN FUNCTION COMPONENT):
  useEffect(() => {
    // 1. Nạp sẵn danh sách giọng đọc tiếng Việt vào bộ nhớ trình duyệt
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // 2. Tải dữ liệu ban đầu
    loadInitialData();

    // 3. Kênh BroadcastChannel (bắt sóng cùng trình duyệt)
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('omni_reservation_channel');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_RESERVATION' && event.data?.data) {
          handleIncomingNewReservation(event.data.data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // 4. Kênh Server-Sent Events (SSE từ Backend)
    const eventSource = new EventSource('http://localhost:8080/api/tables/reservations/subscribe');

    eventSource.onopen = () => {
      setIsRealtimeActive(true);
    };

    eventSource.addEventListener('INIT', () => {
      setIsRealtimeActive(true);
    });

    eventSource.addEventListener('NEW_RESERVATION', (event: MessageEvent) => {
      try {
        const incoming: ReservationItem = JSON.parse(event.data);
        handleIncomingNewReservation(incoming);
      } catch (e) {
        console.error('Lỗi parse SSE:', e);
      }
    });

    eventSource.addEventListener('UPDATE_RESERVATION', (event: MessageEvent) => {
      try {
        const updated: ReservationItem = JSON.parse(event.data);
        setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        reservationApi.getTables().then((t) => setTables(t.data || []));
      } catch (e) {
        console.error('Lỗi parse SSE update:', e);
      }
    });

    eventSource.onerror = () => {
      setIsRealtimeActive(false);
    };

    return () => {
      eventSource.close();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, [loadInitialData, handleIncomingNewReservation]);

  const handleTableClick = (table: TableItem) => {
    const isAvail = table.status?.toLowerCase() === 'available';
    if (isAvail) {
      setOfflineForm((prev) => ({
        ...prev,
        tableId: table.id,
        partySize: Math.min(prev.partySize || 2, table.capacity),
        seatedImmediately: false,
      }));
      setOfflineModal(true);
    }
  };

  const handleAssignTable = async () => {
    if (!assignModal.reservation || !assignModal.selectedTableId) {
      alert('Vui lòng chọn bàn!');
      return;
    }
    try {
      await reservationApi.assignTable(assignModal.reservation.id, assignModal.selectedTableId);
      alert('Xếp bàn thành công!');
      setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' });
      loadInitialData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCheckIn = async (id: string) => {
    if (!window.confirm('Xác nhận khách đã vào nhận bàn?')) return;
    try {
      await reservationApi.checkIn(id);
      alert('Khách đã vào bàn thành công!');
      loadInitialData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    const reason = window.prompt('Nhập lý do hủy đặt bàn:');
    if (reason === null) return;
    try {
      await reservationApi.cancel(id, reason);
      alert('Hủy đơn thành công!');
      loadInitialData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCreateOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...offlineForm,
        partySize: Number(offlineForm.partySize),
        reservationTime: `${offlineForm.reservationDate}T${offlineForm.reservationTime}:00`,
      };
      await reservationApi.createOffline(payload);
      alert('Tạo đơn đặt bàn offline thành công!');
      setOfflineModal(false);
      loadInitialData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const totalTables = tables.length;
  const availTables = tables.filter((t) => t.status?.toLowerCase() === 'available').length;
  const occupiedTables = tables.filter((t) => t.status?.toLowerCase() === 'occupied').length;
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING').length;

  const filteredReservations = reservations.filter((r) =>
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customerPhone.includes(searchTerm) ||
    r.reservationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="adm-res-container">
      {/* ── TOAST THÔNG BÁO TĨNH ÊM ÁI GÓC PHẢI MÀN HÌNH ── */}
      {toastAlert && (
        <div className="adm-toast-card">
          <div className="adm-toast-icon-wrap">
            <Volume2 size={20} color="#ffffff" />
          </div>

          <div className="adm-toast-body">
            <div className="adm-toast-badge">
              ĐƠN ĐẶT BÀN MỚI • {toastAlert.reservationCode}
            </div>
            <div className="adm-toast-name">
              {toastAlert.customerName} ({toastAlert.partySize} khách)
            </div>
            <div className="adm-toast-time">
              Giờ hẹn: {new Date(toastAlert.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {toastAlert.specialNotes && (
              <div className="adm-toast-note">
                {toastAlert.specialNotes}
              </div>
            )}
          </div>

          <button
            type="button"
            className="adm-toast-close-btn"
            onClick={() => setToastAlert(null)}
            title="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div className="adm-res-header">
        <div>
          <div className="adm-header-title-row">
            <h1 className="adm-res-title">Quản Lý Đặt Bàn & Sơ Đồ Phục Vụ</h1>
            <span className={isRealtimeActive ? "adm-live-badge active" : "adm-live-badge standby"}>
              ● {isRealtimeActive ? "Realtime Live" : "Realtime Connecting..."}
            </span>
          </div>
          <p className="adm-res-subtitle">Đơn đặt bàn của khách sẽ xuất hiện ngay lập tức mà không cần tải lại trang</p>
        </div>

        <div className="adm-res-actions">
          <div className="adm-view-toggle">
            <button
              type="button"
              onClick={() => setActiveMode('map')}
              className={`toggle-btn ${activeMode === 'map' ? 'active' : ''}`}
            >
              <LayoutGrid size={16} /> Sơ Đồ Bàn
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('list')}
              className={`toggle-btn ${activeMode === 'list' ? 'active' : ''}`}
            >
              <ListFilter size={16} /> Danh Sách Đơn ({reservations.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadInitialData}
            className="adm-refresh-btn"
            title="Làm mới thủ công"
          >
            <RefreshCw size={17} className={loading ? 'spinning' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setOfflineForm({
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                partySize: 2,
                reservationDate: new Date().toISOString().split('T')[0],
                reservationTime: '19:00',
                tableId: '',
                specialNotes: '',
                seatedImmediately: false,
              });
              setOfflineModal(true);
            }}
            className="adm-btn-create"
          >
            <Plus size={16} /> Đặt Bàn Tại Chỗ / Hotline
          </button>
        </div>
      </div>

      {/* ── THỐNG KÊ NHANH ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card">
          <span className="stat-label">Tổng Bàn Ăn</span>
          <div className="stat-value">{totalTables}</div>
        </div>
        <div className="adm-stat-card stat-avail">
          <span className="stat-label">Bàn Trống Sẵn Sàng</span>
          <div className="stat-value">{availTables}</div>
        </div>
        <div className="adm-stat-card stat-busy">
          <span className="stat-label">Bàn Đang Có Khách</span>
          <div className="stat-value">{occupiedTables}</div>
        </div>
        <div className="adm-stat-card stat-pending">
          <span className="stat-label">Đơn Chờ Xếp Bàn</span>
          <div className="stat-value">{pendingReservations}</div>
        </div>
      </div>

      {/* ── SƠ ĐỒ BÀN ── */}
      {activeMode === 'map' && (
        <div className="adm-card-wrapper">
          <div className="map-toolbar">
            <h3 className="section-heading">Sơ Đồ Bàn Ăn Trực Quan</h3>
            <div className="map-legends">
              <span className="map-legend-item"><span className="legend-dot dot-green"></span> Bàn trống (Bấm để tạo đơn)</span>
              <span className="map-legend-item"><span className="legend-dot dot-yellow"></span> Đã đặt trước</span>
              <span className="map-legend-item"><span className="legend-dot dot-red"></span> Đang dùng bữa</span>
            </div>
          </div>

          <div className="adm-table-grid">
            {tables.map((t) => {
              const isAvailable = t.status?.toLowerCase() === 'available';
              const isOccupied = t.status?.toLowerCase() === 'occupied';

              const reservedOrder = reservations.find(
                (r) => r.tableId === t.id && (r.status === 'CONFIRMED' || r.status === 'SEATED')
              );

              return (
                <div
                  key={t.id}
                  onClick={() => handleTableClick(t)}
                  className={`adm-floor-table ${
                    isAvailable ? 'table-state--free' : isOccupied ? 'table-state--busy' : 'table-state--reserved'
                  }`}
                >
                  <div className="floor-table-top">
                    <span className="floor-table-no">Bàn {t.tableNo}</span>
                    <span className="floor-table-cap">{t.capacity} chỗ</span>
                  </div>

                  <div className="floor-table-center">
                    <Armchair size={36} />
                  </div>

                  <div className="floor-table-status">
                    {isAvailable && <span className="tag-avail">🟢 Bàn Trống</span>}
                    {isOccupied && <span className="tag-busy">🔴 Đang Ăn</span>}
                    {!isAvailable && !isOccupied && <span className="tag-res">🟡 Đã Đặt</span>}
                  </div>

                  {reservedOrder && (
                    <div className="floor-guest-info">
                      <div className="guest-name">
                        <User size={13} /> {reservedOrder.customerName}
                      </div>
                      <div className="guest-time">
                        <Clock size={12} /> {new Date(reservedOrder.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>

                      {reservedOrder.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(reservedOrder.id);
                          }}
                          className="btn-quick-checkin"
                        >
                          Nhận Bàn
                        </button>
                      )}
                    </div>
                  )}

                  {isAvailable && (
                    <span className="click-to-book-hint">+ Đặt bàn này</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BẢNG DANH SÁCH ── */}
      {activeMode === 'list' && (
        <div className="adm-card-wrapper">
          <div className="list-toolbar">
            <div className="status-tab-group">
              {[
                { label: 'Tất cả', value: '' },
                { label: 'Chờ xếp bàn', value: 'PENDING' },
                { label: 'Đã xếp bàn', value: 'CONFIRMED' },
                { label: 'Đang dùng bữa', value: 'SEATED' },
                { label: 'Đã hủy', value: 'CANCELLED' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilterStatus(tab.value)}
                  className={`status-tab-btn ${filterStatus === tab.value ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="search-field-box">
              <Search size={16} className="search-icon-inside" />
              <input
                type="text"
                placeholder="Tìm tên khách, SĐT, mã phiếu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-field"
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="adm-data-table">
              <thead>
                <tr>
                  <th>Mã Phiếu</th>
                  <th>Khách Hàng</th>
                  <th>Thời Gian Dùng</th>
                  <th className="text-center">Số Khách</th>
                  <th>Bàn Phục Vụ</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">Không tìm thấy đơn đặt bàn nào</td>
                  </tr>
                ) : (
                  filteredReservations.map((r) => (
                    <tr key={r.id}>
                      <td className="code-font">{r.reservationCode}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{r.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.customerPhone}</div>
                      </td>
                      <td>
                        <div>{new Date(r.reservationTime).toLocaleDateString('vi-VN')}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                          {new Date(r.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="text-center" style={{ fontWeight: 700 }}>{r.partySize}</td>
                      <td>
                        {r.tableNo ? (
                          <span className="badge-assigned-table">
                            <Armchair size={13} /> Bàn {r.tableNo}
                          </span>
                        ) : (
                          <span className="badge-unassigned">Chưa gán</span>
                        )}
                      </td>
                      <td>
                        {r.status === 'PENDING' && <span className="status-chip chip-pending">Chờ xếp bàn</span>}
                        {r.status === 'CONFIRMED' && <span className="status-chip chip-confirmed">Đã xếp bàn</span>}
                        {r.status === 'SEATED' && <span className="status-chip chip-seated">Đang ăn</span>}
                        {r.status === 'CANCELLED' && <span className="status-chip chip-cancelled">Đã hủy</span>}
                      </td>
                      <td className="text-right">
                        {r.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => setAssignModal({ isOpen: true, reservation: r, selectedTableId: '' })}
                            className="btn-sm btn-assign"
                          >
                            Xếp Bàn
                          </button>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(r.id)}
                            className="btn-sm btn-checkin"
                          >
                            Nhận Bàn
                          </button>
                        )}
                        {r.status !== 'CANCELLED' && r.status !== 'SEATED' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(r.id)}
                            className="btn-sm btn-cancel"
                          >
                            Hủy
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: XẾP BÀN ── */}
      {assignModal.isOpen && assignModal.reservation && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal-box">
            <h3 className="modal-headline">Xếp Bàn Cho Phiếu: {assignModal.reservation.reservationCode}</h3>
            <p className="modal-subtext">
              Khách hàng: <strong>{assignModal.reservation.customerName}</strong> ({assignModal.reservation.partySize} người)
            </p>

            <div className="modal-field-block">
              <label>Chọn bàn khả dụng:</label>
              <select
                className="modal-select-control"
                value={assignModal.selectedTableId}
                onChange={(e) => setAssignModal((prev) => ({ ...prev, selectedTableId: e.target.value }))}
              >
                <option value="">-- Chọn bàn phù hợp --</option>
                {tables
                  .filter((t) => t.capacity >= (assignModal.reservation?.partySize || 0))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNo} ({t.capacity} chỗ) - Trạng thái: {t.status}
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleAssignTable}
              >
                Xác Nhận Xếp Bàn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ĐẶT BÀN OFFLINE TẠI QUÁN / HOTLINE ── */}
      {offlineModal && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal-box modal-width-lg">
            <h3 className="modal-headline">Tạo Đặt Bàn Offline (Tại Chỗ / Hotline)</h3>
            <p className="modal-subtext">Nhập thông tin khách đặt bàn trực tiếp hoặc qua điện thoại</p>

            <form onSubmit={handleCreateOffline} className="modal-styled-form">
              <div className="modal-field-block">
                <label>Tên khách hàng *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Anh Minh"
                  className="modal-input-control"
                  value={offlineForm.customerName}
                  onChange={(e) => setOfflineForm({ ...offlineForm, customerName: e.target.value })}
                />
              </div>

              <div className="grid-2col">
                <div className="modal-field-block">
                  <label>Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0912345678"
                    className="modal-input-control"
                    value={offlineForm.customerPhone}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customerPhone: e.target.value })}
                  />
                </div>
                <div className="modal-field-block">
                  <label>Số lượng khách *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="modal-input-control"
                    value={offlineForm.partySize}
                    onChange={(e) => setOfflineForm({ ...offlineForm, partySize: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid-2col">
                <div className="modal-field-block">
                  <label>Ngày dùng bữa *</label>
                  <input
                    type="date"
                    required
                    className="modal-input-control"
                    value={offlineForm.reservationDate}
                    onChange={(e) => setOfflineForm({ ...offlineForm, reservationDate: e.target.value })}
                  />
                </div>
                <div className="modal-field-block">
                  <label>Giờ đến *</label>
                  <input
                    type="time"
                    required
                    className="modal-input-control"
                    value={offlineForm.reservationTime}
                    onChange={(e) => setOfflineForm({ ...offlineForm, reservationTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-field-block">
                <label>Gán bàn ngay (tùy chọn):</label>
                <select
                  className="modal-select-control"
                  value={offlineForm.tableId}
                  onChange={(e) => setOfflineForm({ ...offlineForm, tableId: e.target.value })}
                >
                  <option value="">-- Xếp bàn sau --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNo} ({t.capacity} chỗ) - [{t.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-checkbox-row">
                <input
                  type="checkbox"
                  id="seatedImmediatelyCheck"
                  className="checkbox-custom"
                  checked={offlineForm.seatedImmediately}
                  onChange={(e) => setOfflineForm({ ...offlineForm, seatedImmediately: e.target.checked })}
                />
                <label htmlFor="seatedImmediatelyCheck">
                  Khách nhận bàn ăn ngay (Đổi bàn sang trạng thái Có Khách)
                </label>
              </div>

              <div className="modal-field-block">
                <label>Ghi chú đặc biệt:</label>
                <input
                  type="text"
                  placeholder="VD: Không ăn cay, bàn ngoài trời..."
                  className="modal-input-control"
                  value={offlineForm.specialNotes}
                  onChange={(e) => setOfflineForm({ ...offlineForm, specialNotes: e.target.value })}
                />
              </div>

              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOfflineModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action">
                  Lưu Đơn Đặt Bàn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}