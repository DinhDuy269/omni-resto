import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { reservationApi } from '../../../api/reservationApi';
import {
  Plus,
  RefreshCw,
  Armchair,
  Search,
  LayoutGrid,
  ListFilter,
  Clock,
  User,
  Users,
  Volume2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import './ReservationManagement.css';

interface TableItem {
  id: string;
  table_no: string;
  capacity: number;
  status: string;
}

interface ReservationItem {
  id: string;
  reservation_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  party_size: number;
  reservation_time: string;
  status: string;
  table_id?: string | null;
  table_no?: string | null;
  table_capacity?: number | null;
  special_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  shift?: string;
  shift_name?: string;
}

interface AssignModalState {
  is_open: boolean;
  reservation: ReservationItem | null;
  selected_table_ids: string[];
}

interface OfflineFormState {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  table_ids: string[];
  special_notes: string;
  seated_immediately: boolean;
}

interface ShiftConfig {
  id: string;
  label: string;
  time_range: string;
}

// Chỉ giữ lại Tất Cả, Ca Sáng, Ca Trưa và Ca Tối
const OPERATING_SHIFTS: ShiftConfig[] = [
  { id: 'ALL', label: 'Tất Cả Ca', time_range: 'Toàn bộ' },
  { id: 'MORNING', label: 'Ca Sáng', time_range: '06:00 - 10:30' },
  { id: 'NOON', label: 'Ca Trưa', time_range: '10:30 - 14:30' },
  { id: 'EVENING', label: 'Ca Tối', time_range: '16:30 - 22:00' },
];

function getShiftFromReservationTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 360 && minutes < 630) return 'MORNING';  // 06:00 - 10:30
  if (minutes >= 630 && minutes < 870) return 'NOON';     // 10:30 - 14:30
  if (minutes >= 990 && minutes < 1320) return 'EVENING'; // 16:30 - 22:00
  return '';
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã có lỗi xảy ra!';
}

function speakReservationAlert(customerName: string, partySize: number, note?: string | null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    let tableSpeech = '';
    if (note && note.includes('Khách chọn:')) {
      const match = note.match(/Khách chọn:\s*(Bàn\s*[A-Za-z0-9_-]+)/i);
      if (match) {
        let rawTable = match[1].trim();
        rawTable = rawTable.replace(/T-0?/i, 'Tê ');
        tableSpeech = `. Tại ${rawTable}`;
      }
    }

    const textToRead = `Thông báo! Có đơn đặt bàn mới. Khách hàng: ${customerName}. Số lượng: ${partySize} người${tableSpeech}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const viVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('vi') ||
        v.name.toLowerCase().includes('vietnam') ||
        v.name.toLowerCase().includes('tiếng việt')
    );

    if (viVoices.length > 0) {
      const bestVoice =
        viVoices.find((v) => v.name.includes('Natural') || v.name.includes('Neural')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('hoaimy')) ||
        viVoices.find((v) => v.name.toLowerCase().includes('google')) ||
        viVoices[0];

      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis error:', e);
  }
}

export default function ReservationManagement(): React.ReactElement {
  const [activeMode, setActiveMode] = useState<'map' | 'list'>('map');

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [toastAlert, setToastAlert] = useState<ReservationItem | null>(null);

  const [assignModal, setAssignModal] = useState<AssignModalState>({
    is_open: false,
    reservation: null,
    selected_table_ids: [],
  });

  const [offlineModal, setOfflineModal] = useState<boolean>(false);
  const [offlineForm, setOfflineForm] = useState<OfflineFormState>({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    party_size: 15,
    reservation_date: new Date().toISOString().split('T')[0],
    reservation_time: '19:00',
    table_ids: [],
    special_notes: '',
    seated_immediately: false,
  });

  const notifyClientTabs = useCallback(() => {
    try {
      const channel = new BroadcastChannel('omni_reservation_channel');
      channel.postMessage({ type: 'TABLE_STATUS_UPDATED' });
      channel.close();
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
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

    speakReservationAlert(incoming.customer_name, incoming.party_size, incoming.special_notes);

    setToastAlert(incoming);
    setTimeout(() => {
      setToastAlert((curr) => (curr?.id === incoming.id ? null : curr));
    }, 8000);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    const initTimer = setTimeout(() => {
      loadData();
    }, 0);

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

    const eventSource = new EventSource('http://localhost:8080/api/tables/reservations/subscribe');

    eventSource.onopen = () => setIsRealtimeActive(true);
    eventSource.addEventListener('INIT', () => setIsRealtimeActive(true));

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

    eventSource.onerror = () => setIsRealtimeActive(false);

    return () => {
      clearTimeout(initTimer);
      eventSource.close();
      if (broadcastChannel) broadcastChannel.close();
    };
  }, [loadData, handleIncomingNewReservation]);

  const handleTableClick = (table: TableItem) => {
    const isAvail = table.status?.toLowerCase() === 'available';
    if (isAvail) {
      setOfflineForm((prev) => ({
        ...prev,
        table_ids: [table.id],
        party_size: table.capacity,
        seated_immediately: false,
      }));
      setOfflineModal(true);
    }
  };

  const toggleAssignTableId = (tblId: string) => {
    setAssignModal((prev) => ({
      ...prev,
      selected_table_ids: prev.selected_table_ids.includes(tblId)
        ? prev.selected_table_ids.filter((id) => id !== tblId)
        : [...prev.selected_table_ids, tblId],
    }));
  };

  const toggleOfflineTableId = (tblId: string) => {
    setOfflineForm((prev) => ({
      ...prev,
      table_ids: prev.table_ids.includes(tblId)
        ? prev.table_ids.filter((id) => id !== tblId)
        : [...prev.table_ids, tblId],
    }));
  };

  const handleAssignTable = async () => {
    if (!assignModal.reservation || assignModal.selected_table_ids.length === 0) {
      alert('Vui lòng chọn ít nhất một bàn để ghép/gán!');
      return;
    }
    try {
      await reservationApi.assignTable(assignModal.reservation.id, assignModal.selected_table_ids);
      alert(`Đã xếp thành công ${assignModal.selected_table_ids.length} bàn cho khách!`);
      notifyClientTabs();
      setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] });
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCheckIn = async (id: string) => {
    if (!window.confirm('Xác nhận khách đã vào nhận bàn?')) return;
    try {
      await reservationApi.checkIn(id);
      alert('Khách đã vào bàn thành công!');
      notifyClientTabs();
      setLoading(true);
      loadData();
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
      notifyClientTabs();
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCreateOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...offlineForm,
        party_size: Number(offlineForm.party_size),
        reservation_time: `${offlineForm.reservation_date}T${offlineForm.reservation_time}:00`,
      };
      await reservationApi.createOffline(payload);
      alert('Tạo đơn đặt bàn hotline / offline thành công!');
      notifyClientTabs();
      setOfflineModal(false);
      setLoading(true);
      loadData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const totalTables = tables.length;
  const availTables = tables.filter((t) => t.status?.toLowerCase() === 'available').length;
  const occupiedTables = tables.filter((t) => t.status?.toLowerCase() === 'occupied').length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending').length;

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesSearch =
        r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer_phone.includes(searchTerm) ||
        r.reservation_code.toLowerCase().includes(searchTerm.toLowerCase());

      const itemShift = r.shift || getShiftFromReservationTime(r.reservation_time);
      const matchesShift = selectedShift === 'ALL' || itemShift === selectedShift;

      return matchesSearch && matchesShift;
    });
  }, [reservations, searchTerm, selectedShift]);

  const totalItems = filteredReservations.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedReservations = useMemo(() => {
    return filteredReservations.slice(startIndex, endIndex);
  }, [filteredReservations, startIndex, endIndex]);

  const assignTotalCapacity = tables
    .filter((t) => assignModal.selected_table_ids.includes(t.id))
    .reduce((sum, t) => sum + (t.capacity || 0), 0);

  const offlineTotalCapacity = tables
    .filter((t) => offlineForm.table_ids.includes(t.id))
    .reduce((sum, t) => sum + (t.capacity || 0), 0);

  return (
    <div className="adm-res-container">
      {/* ── TOAST REALTIME GÓC PHẢI MÀN HÌNH ── */}
      {toastAlert && (
        <div className="adm-toast-card">
          <div className="adm-toast-icon-wrap">
            <Volume2 size={20} color="#ffffff" />
          </div>

          <div className="adm-toast-body">
            <div className="adm-toast-badge">
              ĐƠN ĐẶT BÀN MỚI • {toastAlert.reservation_code}
            </div>
            <div className="adm-toast-name">
              {toastAlert.customer_name} ({toastAlert.party_size} khách)
            </div>
            <div className="adm-toast-time">
              Giờ hẹn: {new Date(toastAlert.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {toastAlert.special_notes && (
              <div className="adm-toast-note">
                {toastAlert.special_notes}
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
            <h1 className="adm-res-title">Quản Lý Đặt Bàn & Ghép Bàn Chuỗi</h1>
            <span className={isRealtimeActive ? "adm-live-badge active" : "adm-live-badge standby"}>
              ● {isRealtimeActive ? "Realtime Live" : "Realtime Connecting..."}
            </span>
          </div>
          <p className="adm-res-subtitle">Tiếp nhận đoàn đông qua hotline, tự do ghép bàn liền kề và cập nhật sơ đồ thời gian thực</p>
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
            onClick={() => {
              setLoading(true);
              loadData();
            }}
            className="adm-refresh-btn"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={loading ? 'spinning' : ''} />
          </button>

          <button
            type="button"
            onClick={() => {
              setOfflineForm({
                customer_name: '',
                customer_phone: '',
                customer_email: '',
                party_size: 15,
                reservation_date: new Date().toISOString().split('T')[0],
                reservation_time: '19:00',
                table_ids: [],
                special_notes: '',
                seated_immediately: false,
              });
              setOfflineModal(true);
            }}
            className="adm-btn-create"
          >
            <Plus size={16} /> Nhận Đơn Hotline (Ghép Bàn)
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

      {/* ── SƠ ĐỒ BÀN ĂN ── */}
      {activeMode === 'map' && (
        <div className="adm-card-wrapper">
          <div className="map-toolbar">
            <h3 className="section-heading">Sơ Đồ Bàn Ăn Trực Quan</h3>
            <div className="map-legends">
              <span className="map-legend-item"><span className="legend-dot dot-green"></span> Bàn trống</span>
              <span className="map-legend-item"><span className="legend-dot dot-yellow"></span> Đã đặt</span>
              <span className="map-legend-item"><span className="legend-dot dot-red"></span> Đang ăn</span>
            </div>
          </div>

          <div className="adm-table-grid">
            {tables.map((t) => {
              const isAvailable = t.status?.toLowerCase() === 'available';
              const isOccupied = t.status?.toLowerCase() === 'occupied';

              const reservedOrder = reservations.find((r) => {
                if (r.status !== 'confirmed' && r.status !== 'seated') return false;
                if (r.table_id === t.id) return true;
                if (r.special_notes && r.special_notes.includes(t.id)) return true;
                return false;
              });

              const isMerged = reservedOrder && reservedOrder.table_no && reservedOrder.table_no.includes('+');

              return (
                <div
                  key={t.id}
                  onClick={() => handleTableClick(t)}
                  className={`adm-floor-table ${
                    isAvailable ? 'table-state--free' : isOccupied ? 'table-state--busy' : 'table-state--reserved'
                  }`}
                >
                  {isMerged && (
                    <span className="tag-merged-badge">Bàn Ghép</span>
                  )}

                  <div className="floor-table-top">
                    <span className="floor-table-no">Bàn {t.table_no}</span>
                    <span className="floor-table-cap">{t.capacity} chỗ</span>
                  </div>

                  <div className="floor-table-center">
                    <Armchair size={36} />
                  </div>

                  <div className="floor-table-status">
                    {isAvailable && <span className="tag-avail">🟢 Sẵn Sàng</span>}
                    {isOccupied && <span className="tag-busy">🔴 Đang Dùng</span>}
                    {!isAvailable && !isOccupied && <span className="tag-res">🟡 Đã Giữ Chỗ</span>}
                  </div>

                  {reservedOrder && (
                    <div className="floor-guest-info">
                      <div className="guest-name">
                        <User size={13} /> {reservedOrder.customer_name}
                      </div>
                      <div className="guest-time">
                        <Clock size={12} /> {new Date(reservedOrder.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ({reservedOrder.party_size}k)
                      </div>

                      {reservedOrder.status === 'confirmed' && (
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
                    <span className="click-to-book-hint">+ Nhấp để gán</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BẢNG DANH SÁCH ĐƠN ── */}
      {activeMode === 'list' && (
        <div className="adm-card-wrapper">
          {/* THANH LỌC CA VẬN HÀNH: SÁNG / TRƯA / TỐI */}
          <div className="shift-filter-toolbar">
            <span className="shift-filter-label">
              <Clock size={15} color="#059669" /> Lọc Ca Làm Việc:
            </span>
            <div className="shift-chips-scroll">
              {OPERATING_SHIFTS.map((shift) => {
                const isActive = selectedShift === shift.id;
                const count = reservations.filter((r) => {
                  const s = r.shift || getShiftFromReservationTime(r.reservation_time);
                  return shift.id === 'ALL' || s === shift.id;
                }).length;

                return (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      setSelectedShift(shift.id);
                      setCurrentPage(1);
                    }}
                    className={`shift-chip-btn ${isActive ? 'active' : ''}`}
                  >
                    <span>{shift.label}</span>
                    <span className="shift-chip-time">({shift.time_range})</span>
                    <span className="shift-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="list-toolbar">
            <div className="status-tab-group">
              {[
                { label: 'Tất cả', value: '' },
                { label: 'Chờ xếp bàn', value: 'pending' },
                { label: 'Đã xếp bàn', value: 'confirmed' },
                { label: 'Đang dùng bữa', value: 'seated' },
                { label: 'Đã hủy', value: 'cancelled' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.value);
                    setCurrentPage(1);
                  }}
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
                  <th>Thời Gian & Ca</th>
                  <th className="text-center">Số Khách</th>
                  <th>Bàn Phục Vụ</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell" style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                      Không tìm thấy đơn đặt bàn nào theo tiêu chí đã chọn
                    </td>
                  </tr>
                ) : (
                  paginatedReservations.map((r) => {
                    const isMulti = r.table_no && r.table_no.includes('+');
                    const shiftKey = (r.shift || getShiftFromReservationTime(r.reservation_time)).toLowerCase();
                    const shiftConfig = OPERATING_SHIFTS.find((s) => s.id.toLowerCase() === shiftKey);

                    return (
                      <tr key={r.id}>
                        <td className="code-font">{r.reservation_code}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{r.customer_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.customer_phone}</div>
                        </td>
                        <td>
                          <div>{new Date(r.reservation_time).toLocaleDateString('vi-VN')}</div>
                          <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: 700 }}>
                            {new Date(r.reservation_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {shiftConfig && shiftConfig.id !== 'ALL' && (
                            <span className={`badge-shift badge-shift-${shiftKey}`}>
                              {shiftConfig.label}
                            </span>
                          )}
                        </td>
                        <td className="text-center" style={{ fontWeight: 700 }}>
                          {r.party_size} {r.party_size > 10 && <span title="Đoàn đông ghép bàn" style={{ color: '#d97706' }}>★</span>}
                        </td>
                        <td>
                          {r.table_no ? (
                            <span className={isMulti ? "badge-assigned-table is-merged" : "badge-assigned-table"}>
                              <Armchair size={13} /> {isMulti ? `Ghép: ${r.table_no}` : `Bàn ${r.table_no}`}
                            </span>
                          ) : (
                            <span className="badge-unassigned">Chưa gán</span>
                          )}
                        </td>
                        <td>
                          {r.status === 'pending' && <span className="status-chip chip-pending">Chờ xếp bàn</span>}
                          {r.status === 'confirmed' && <span className="status-chip chip-confirmed">Đã xếp bàn</span>}
                          {r.status === 'seated' && <span className="status-chip chip-seated">Đang ăn</span>}
                          {r.status === 'cancelled' && <span className="status-chip chip-cancelled">Đã hủy</span>}
                        </td>
                        <td className="text-right">
                          {r.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => setAssignModal({
                                is_open: true,
                                reservation: r,
                                selected_table_ids: r.table_id ? [r.table_id] : []
                              })}
                              className="btn-sm btn-assign"
                            >
                              Xếp / Ghép Bàn
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleCheckIn(r.id)}
                              className="btn-sm btn-checkin"
                            >
                              Nhận Bàn
                            </button>
                          )}
                          {r.status !== 'cancelled' && r.status !== 'seated' && (
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── FOOTER PHÂN TRANG ── */}
          {totalItems > 0 && (
            <div className="adm-pagination-bar">
              <div className="pagination-stats-info">
                Hiển thị <strong>{startIndex + 1} - {endIndex}</strong> trên tổng số <strong>{totalItems}</strong> đơn
              </div>

              <div className="pagination-nav-group">
                <div className="pagination-size-box">
                  <span>Số hàng:</span>
                  <select
                    className="pagination-size-select"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 / trang</option>
                    <option value={10}>10 / trang</option>
                    <option value={15}>15 / trang</option>
                    <option value={20}>20 / trang</option>
                  </select>
                </div>

                <div className="pagination-btn-cluster">
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages)
                    .map((page, idx, arr) => {
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span style={{ padding: '0 4px', color: '#9ca3af' }}>...</span>}
                          <button
                            type="button"
                            className={`page-btn ${currentPage === page ? 'active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    className="page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Trang cuối"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: XẾP / GHÉP NHIỀU BÀN CHO ĐƠN PENDING ── */}
      {assignModal.is_open && assignModal.reservation && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal-box modal-width-lg">
            <h3 className="modal-headline">
              Xếp & Ghép Bàn Cho Phiếu: {assignModal.reservation.reservation_code}
            </h3>
            <p className="modal-subtext">
              Khách hàng: <strong>{assignModal.reservation.customer_name}</strong> • Quy mô đoàn: <strong>{assignModal.reservation.party_size} người</strong>
            </p>

            <div className={`capacity-summary-bar ${assignTotalCapacity >= assignModal.reservation.party_size ? 'is-sufficient' : 'is-insufficient'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} />
                <span>
                  Đã chọn: <strong>{assignModal.selected_table_ids.length} bàn</strong> • Tổng sức chứa: <strong>{assignTotalCapacity} ghế</strong> / {assignModal.reservation.party_size} khách
                </span>
              </div>
              <span className="capacity-badge">
                {assignTotalCapacity >= assignModal.reservation.party_size ? '✓ Đủ Sức Chứa' : '(! Cần ghép thêm bàn)'}
              </span>
            </div>

            <div className="modal-field-block">
              <label>Chọn một hoặc nhiều bàn trống để ghép cụm bàn:</label>
              <div className="modal-table-picker-grid">
                {tables
                  .filter((t) => t.status?.toLowerCase() === 'available' || assignModal.selected_table_ids.includes(t.id))
                  .map((t) => {
                    const isSelected = assignModal.selected_table_ids.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleAssignTableId(t.id)}
                        className={`picker-table-chip ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="chip-check-mark">
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div className="chip-table-no">Bàn {t.table_no}</div>
                        <div className="chip-table-cap">{t.capacity} chỗ ngồi</div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAssignModal({ is_open: false, reservation: null, selected_table_ids: [] })}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleAssignTable}
              >
                Xác Nhận Xếp {assignModal.selected_table_ids.length > 1 ? `Ghép ${assignModal.selected_table_ids.length} Bàn` : 'Bàn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ĐẶT BÀN OFFLINE TẠI QUÁN / HOTLINE GHÉP BÀN ── */}
      {offlineModal && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal-box modal-width-lg">
            <h3 className="modal-headline">Tiếp Nhận Đặt Bàn Hotline / Đoàn Đông</h3>
            <p className="modal-subtext">Nhập thông tin khách đặt qua điện thoại và chọn cụm bàn ghép tương ứng</p>

            <form onSubmit={handleCreateOffline} className="modal-styled-form">
              <div className="modal-field-block">
                <label>Tên khách hàng / Đơn vị *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Anh Tuấn (Công ty FPT)"
                  className="modal-input-control"
                  value={offlineForm.customer_name}
                  onChange={(e) => setOfflineForm({ ...offlineForm, customer_name: e.target.value })}
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
                    value={offlineForm.customer_phone}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customer_phone: e.target.value })}
                  />
                </div>
                <div className="modal-field-block">
                  <label>Số lượng khách (người) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="modal-input-control"
                    value={offlineForm.party_size}
                    onChange={(e) => setOfflineForm({ ...offlineForm, party_size: Number(e.target.value) })}
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
                    value={offlineForm.reservation_date}
                    onChange={(e) => setOfflineForm({ ...offlineForm, reservation_date: e.target.value })}
                  />
                </div>
                <div className="modal-field-block">
                  <label>Giờ đến *</label>
                  <input
                    type="time"
                    required
                    className="modal-input-control"
                    value={offlineForm.reservation_time}
                    onChange={(e) => setOfflineForm({ ...offlineForm, reservation_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-field-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Chọn các bàn cần ghép ({offlineForm.table_ids.length} bàn đã chọn):</label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: offlineTotalCapacity >= offlineForm.party_size ? '#059669' : '#dc2626' }}>
                    Sức chứa: {offlineTotalCapacity}/{offlineForm.party_size} ghế
                  </span>
                </div>

                <div className="modal-table-picker-grid">
                  {tables
                    .filter((t) => t.status?.toLowerCase() === 'available' || offlineForm.table_ids.includes(t.id))
                    .map((t) => {
                      const isSelected = offlineForm.table_ids.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleOfflineTableId(t.id)}
                          className={`picker-table-chip ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="chip-check-mark">
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="chip-table-no">Bàn {t.table_no}</div>
                          <div className="chip-table-cap">{t.capacity} chỗ</div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="modal-checkbox-row">
                <input
                  type="checkbox"
                  id="seatedImmediatelyCheck"
                  className="checkbox-custom"
                  checked={offlineForm.seated_immediately}
                  onChange={(e) => setOfflineForm({ ...offlineForm, seated_immediately: e.target.checked })}
                />
                <label htmlFor="seatedImmediatelyCheck">
                  Khách đang có mặt tại quán (Xếp vào ngồi ăn luôn - Check-in SEATED)
                </label>
              </div>

              <div className="modal-field-block">
                <label>Ghi chú sắp xếp bàn:</label>
                <input
                  type="text"
                  placeholder="VD: Kê bàn chữ U, chuẩn bị hoa sinh nhật..."
                  className="modal-input-control"
                  value={offlineForm.special_notes}
                  onChange={(e) => setOfflineForm({ ...offlineForm, special_notes: e.target.value })}
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
                  Lưu Đơn & Khóa Bàn Ghép
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export { ReservationManagement };
