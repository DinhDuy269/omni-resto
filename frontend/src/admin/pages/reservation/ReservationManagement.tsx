import React, { useState, useEffect, useMemo } from 'react';
import { reservationApi } from '../../../shared/api/reservationApi';
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
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  Copy,
  Check,
  Eye,
  X,
  XCircle,
  AlertCircle,
  Sparkles,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import './ReservationManagement.css';

interface TableItem {
  id: string;
  table_no?: string;
  tableNo?: string;
  capacity: number;
  status: string;
  current_order_id?: string | null;
  qr_secret_token?: string;
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

interface CancelModalState {
  isOpen: boolean;
  reservationId: string;
  reservationCode: string;
  reason: string;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string; error?: string } } }).response;
    if (res?.data?.message) return res.data.message;
    if (res?.data?.error) return res.data.error;
  }
  if (err instanceof Error) return err.message;
  return 'Đã có lỗi xảy ra!';
}

export function ReservationManagement(): React.ReactElement {
  // 'map' (Xem sơ đồ bàn trực quan) | 'list' (Xem danh sách bảng dữ liệu)
  const [activeMode, setActiveMode] = useState<'map' | 'list'>('map');

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal Xếp bàn
  const [assignModal, setAssignModal] = useState<AssignModalState>({
    isOpen: false,
    reservation: null,
    selectedTableId: '',
  });

  // Modal Chi tiết phiếu đặt bàn
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    reservation: ReservationItem | null;
  }>({
    isOpen: false,
    reservation: null,
  });

  // Modal Hủy đặt bàn có lý do
  const [cancelModal, setCancelModal] = useState<CancelModalState>({
    isOpen: false,
    reservationId: '',
    reservationCode: '',
    reason: '',
  });

  // Modal Đặt bàn Offline / Hotline
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

  // Helper lấy tên bàn chuẩn xác
  const getTableName = (t: TableItem): string => {
    const name = (t.table_no || t.tableNo || '').trim();
    if (!name) return `Bàn ${t.id.replace('tbl-', '')}`;
    if (name.toLowerCase().startsWith('bàn')) return name;
    return `Bàn ${name}`;
  };

  // Helper phân vùng khu vực (Floor Zone)
  const getTableZone = (t: TableItem): { id: string; name: string; tag: string } => {
    const name = getTableName(t);
    const numMatch = name.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 1;
    if (num <= 6) {
      return { id: 'FLOOR_1', name: 'Tầng 1 · Sảnh Ánh Sáng', tag: 'Tầng 1' };
    } else if (num <= 9) {
      return { id: 'FLOOR_2', name: 'Tầng 2 · Ban Công View Phố', tag: 'Tầng 2' };
    } else {
      return { id: 'FLOOR_VIP', name: 'Tầng 3 · Phòng VIP Tổng Thống', tag: 'VIP' };
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        const [resData, tablesData] = await Promise.all([
          reservationApi.getAll(filterStatus),
          reservationApi.getTables(),
        ]);
        if (!isCancelled) {
          setReservations(resData.data || []);
          setTables(tablesData.data || []);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Lỗi nạp dữ liệu:', extractErrorMessage(err));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [filterStatus]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [resData, tablesData] = await Promise.all([
        reservationApi.getAll(filterStatus),
        reservationApi.getTables(),
      ]);
      setReservations(resData.data || []);
      setTables(tablesData.data || []);
    } catch (err: unknown) {
      alert(`Lỗi làm mới: ${extractErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý click vào bàn trên Sơ đồ
  const handleTableClick = (table: TableItem) => {
    const isAvail = table.status?.toLowerCase() === 'available';
    if (isAvail) {
      setOfflineForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        partySize: Math.min(2, table.capacity),
        reservationDate: new Date().toISOString().split('T')[0],
        reservationTime: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        tableId: table.id,
        specialNotes: '',
        seatedImmediately: false,
      });
      setOfflineModal(true);
    } else {
      // Tìm đơn của bàn này nếu có
      const reservedOrder = reservations.find(
        (r) => r.tableId === table.id && (r.status === 'CONFIRMED' || r.status === 'SEATED')
      );
      if (reservedOrder) {
        setDetailModal({ isOpen: true, reservation: reservedOrder });
      }
    }
  };

  // Xử lý Xếp bàn
  const handleAssignTable = async () => {
    if (!assignModal.reservation || !assignModal.selectedTableId) {
      alert('Vui lòng chọn bàn phục vụ!');
      return;
    }
    try {
      await reservationApi.assignTable(assignModal.reservation.id, assignModal.selectedTableId);
      alert('Xếp bàn thành công!');
      setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' });
      if (detailModal.isOpen) setDetailModal({ isOpen: false, reservation: null });
      await refreshData();
    } catch (err: unknown) {
      alert(`Lỗi xếp bàn: ${extractErrorMessage(err)}`);
    }
  };

  // Xử lý Nhận bàn (Check-in)
  const handleCheckIn = async (reservationId: string) => {
    if (!window.confirm('Xác nhận khách đã đến và nhận bàn để bắt đầu phục vụ?')) return;
    try {
      await reservationApi.checkIn(reservationId);
      alert('Khách đã nhận bàn thành công!');
      if (detailModal.isOpen) setDetailModal({ isOpen: false, reservation: null });
      await refreshData();
    } catch (err: unknown) {
      alert(`Lỗi nhận bàn: ${extractErrorMessage(err)}`);
    }
  };

  // Xử lý Hủy đặt bàn
  const handleConfirmCancel = async () => {
    if (!cancelModal.reservationId) return;
    try {
      await reservationApi.cancel(cancelModal.reservationId, cancelModal.reason || 'Khách yêu cầu hủy');
      alert('Đã hủy đặt bàn thành công!');
      setCancelModal({ isOpen: false, reservationId: '', reservationCode: '', reason: '' });
      if (detailModal.isOpen) setDetailModal({ isOpen: false, reservation: null });
      await refreshData();
    } catch (err: unknown) {
      alert(`Lỗi hủy đặt bàn: ${extractErrorMessage(err)}`);
    }
  };

  // Xử lý Tạo đơn Offline
  const handleCreateOffline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineForm.customerName || !offlineForm.customerPhone || !offlineForm.reservationDate || !offlineForm.reservationTime) {
      alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
      return;
    }

    try {
      const fullTimeStr = `${offlineForm.reservationDate}T${offlineForm.reservationTime}:00`;
      await reservationApi.createOffline({
        customerName: offlineForm.customerName.trim(),
        customerPhone: offlineForm.customerPhone.trim(),
        customerEmail: offlineForm.customerEmail.trim() || null,
        partySize: Number(offlineForm.partySize),
        reservationTime: fullTimeStr,
        tableId: offlineForm.tableId || null,
        specialNotes: offlineForm.specialNotes.trim() || null,
        seatedImmediately: offlineForm.seatedImmediately,
      });

      alert('Tạo đơn đặt bàn thành công!');
      setOfflineModal(false);
      await refreshData();
    } catch (err: unknown) {
      alert(`Lỗi tạo đơn: ${extractErrorMessage(err)}`);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Thống kê số lượng
  const totalTables = tables.length;
  const availTables = tables.filter((t) => t.status?.toLowerCase() === 'available').length;
  const occupiedTables = tables.filter((t) => t.status?.toLowerCase() === 'occupied').length;
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING').length;
  const confirmedReservations = reservations.filter((r) => r.status === 'CONFIRMED').length;
  const seatedReservations = reservations.filter((r) => r.status === 'SEATED').length;
  const cancelledReservations = reservations.filter((r) => r.status === 'CANCELLED').length;

  // Lọc danh sách bàn theo khu vực
  const filteredFloorTables = useMemo(() => {
    if (selectedZone === 'ALL') return tables;
    return tables.filter((t) => getTableZone(t).id === selectedZone);
  }, [tables, selectedZone]);

  // Lọc danh sách đơn đặt bàn đa chiều
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // 1. Lọc theo trạng thái tab
      if (filterStatus && r.status !== filterStatus) return false;

      // 2. Tìm kiếm từ khóa
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = r.customerName?.toLowerCase().includes(q);
        const matchPhone = r.customerPhone?.includes(q);
        const matchCode = r.reservationCode?.toLowerCase().includes(q);
        const matchTable = r.tableNo?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchTable) return false;
      }

      // 3. Lọc theo ngày
      if (dateFilter !== 'ALL' && r.reservationTime) {
        const resDate = new Date(r.reservationTime);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const resDateStr = resDate.toISOString().split('T')[0];

        if (dateFilter === 'TODAY') {
          if (resDateStr !== todayStr) return false;
        } else if (dateFilter === 'TOMORROW') {
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          if (resDateStr !== tomorrowStr) return false;
        } else if (dateFilter === 'WEEK') {
          const nextWeek = new Date(now);
          nextWeek.setDate(now.getDate() + 7);
          if (resDate < now || resDate > nextWeek) return false;
        }
      }

      return true;
    });
  }, [reservations, filterStatus, searchTerm, dateFilter]);

  return (
    <div className="adm-res-container">
      {/* ── HEADER ── */}
      <div className="adm-res-header">
        <div className="adm-res-title-box">
          <h2 className="adm-res-title">
            Quản Lý Đặt Bàn & Sơ Đồ Phục Vụ
            <span className="adm-res-title-badge">Realtime Active</span>
          </h2>
          <p className="adm-res-subtitle">
            Theo dõi trạng thái phòng bàn thời gian thực và tiếp đón thực khách chu đáo
          </p>
        </div>

        <div className="adm-res-actions">
          {/* Toggle Switcher */}
          <div className="adm-view-toggle">
            <button
              type="button"
              onClick={() => setActiveMode('map')}
              className={`toggle-btn ${activeMode === 'map' ? 'active' : ''}`}
            >
              <LayoutGrid size={15} /> Sơ Đồ Bàn
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('list')}
              className={`toggle-btn ${activeMode === 'list' ? 'active' : ''}`}
            >
              <ListFilter size={15} /> Danh Sách Đơn
              <span className="toggle-btn-badge">{reservations.length}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={refreshData}
            className="adm-refresh-btn"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
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
            <Plus size={16} /> + Đặt Bàn / Hotline
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="adm-stats-grid">
        <div className="adm-stat-card stat-all">
          <div className="stat-info">
            <span className="stat-label">Tổng Bàn Ăn</span>
            <div className="stat-value">{totalTables}</div>
            <span className="stat-subtext">3 Khu vực ẩm thực</span>
          </div>
          <div className="stat-icon-wrapper">
            <Armchair size={22} />
          </div>
        </div>

        <div className="adm-stat-card stat-avail">
          <div className="stat-info">
            <span className="stat-label">Bàn Trống Sẵn Sàng</span>
            <div className="stat-value">{availTables}</div>
            <span className="stat-subtext" style={{ color: '#059669', fontWeight: 600 }}>
              {totalTables > 0 ? Math.round((availTables / totalTables) * 100) : 0}% công suất mở
            </span>
          </div>
          <div className="stat-icon-wrapper">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="adm-stat-card stat-busy">
          <div className="stat-info">
            <span className="stat-label">Bàn Đang Có Khách</span>
            <div className="stat-value">{occupiedTables}</div>
            <span className="stat-subtext" style={{ color: '#e11d48', fontWeight: 600 }}>
              Đang dùng bữa tại bàn
            </span>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={22} />
          </div>
        </div>

        <div className="adm-stat-card stat-pending">
          <div className="stat-info">
            <span className="stat-label">Đơn Online Chờ Xếp</span>
            <div className="stat-value">{pendingReservations}</div>
            <span className="stat-subtext" style={{ color: pendingReservations > 0 ? '#d97706' : 'var(--text-muted)', fontWeight: 600 }}>
              {pendingReservations > 0 ? '⚡ Cần xử lý xếp chỗ ngay' : 'Đã xếp chỗ hoàn tất'}
            </span>
          </div>
          <div className="stat-icon-wrapper">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHẾ ĐỘ 1: SƠ ĐỒ BÀN TRỰC QUAN (FLOOR MAP)
          ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'map' && (
        <div className="adm-card-wrapper">
          <div className="map-toolbar">
            <div className="map-zone-tabs">
              {[
                { id: 'ALL', name: 'Tất Cả Khu Vực' },
                { id: 'FLOOR_1', name: 'Tầng 1 · Sảnh Ánh Sáng' },
                { id: 'FLOOR_2', name: 'Tầng 2 · Ban Công View Phố' },
                { id: 'FLOOR_VIP', name: 'Tầng 3 · Phòng VIP' },
              ].map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedZone(zone.id)}
                  className={`zone-tab-btn ${selectedZone === zone.id ? 'active' : ''}`}
                >
                  <MapPin size={13} /> {zone.name}
                </button>
              ))}
            </div>

            <div className="map-legends">
              <span className="map-legend-item">
                <span className="legend-dot dot-green"></span> Bàn trống (Sẵn sàng)
              </span>
              <span className="map-legend-item">
                <span className="legend-dot dot-yellow"></span> Giữ chỗ đặt trước
              </span>
              <span className="map-legend-item">
                <span className="legend-dot dot-red"></span> Đang dùng bữa
              </span>
            </div>
          </div>

          <div className="adm-table-grid">
            {filteredFloorTables.map((t) => {
              const isAvailable = t.status?.toLowerCase() === 'available';
              const isOccupied = t.status?.toLowerCase() === 'occupied';
              const zone = getTableZone(t);
              const tableName = getTableName(t);

              // Tìm đơn đặt bàn tương ứng đã xếp cho bàn này
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
                    <div className="floor-table-badge-group">
                      <span className="floor-table-no">{tableName}</span>
                      <span className="floor-table-zone-tag">{zone.tag}</span>
                    </div>
                    <span className="floor-table-cap">
                      <Users size={12} /> {t.capacity} chỗ
                    </span>
                  </div>

                  {/* Minh họa bàn ăn phong cách sang trọng */}
                  <div className="floor-table-visual">
                    <div className="table-icon-circle">
                      <Armchair size={30} />
                    </div>

                    <div className="floor-table-status-pill">
                      {isAvailable && (
                        <>
                          <span className="pulse-dot pulse-green"></span>
                          <span>Bàn Trống</span>
                        </>
                      )}
                      {isOccupied && (
                        <>
                          <span className="pulse-dot pulse-rose"></span>
                          <span>Đang Dùng Bữa</span>
                        </>
                      )}
                      {!isAvailable && !isOccupied && (
                        <>
                          <span className="pulse-dot pulse-amber"></span>
                          <span>Đã Đặt Trước</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Thông tin khách nếu bàn có đặt trước */}
                  {reservedOrder && (
                    <div className="floor-guest-card" onClick={(e) => e.stopPropagation()}>
                      <div className="guest-card-header">
                        <span className="guest-card-name" title={reservedOrder.customerName}>
                          <User size={12} /> {reservedOrder.customerName}
                        </span>
                        <span className="guest-card-time">
                          <Clock size={11} />{' '}
                          {new Date(reservedOrder.reservationTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="guest-card-actions">
                        {reservedOrder.status === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => handleCheckIn(reservedOrder.id)}
                            className="btn-quick-checkin"
                          >
                            <CheckCircle2 size={12} /> Nhận Bàn
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailModal({ isOpen: true, reservation: reservedOrder })}
                          className="btn-quick-detail"
                        >
                          <Eye size={12} /> Chi Tiết
                        </button>
                      </div>
                    </div>
                  )}

                  {isAvailable && (
                    <div className="click-to-book-action">
                      + Bấm để đặt chỗ bàn này
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CHẾ ĐỘ 2: BẢNG DANH SÁCH CHI TIẾT (LIST VIEW)
          ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'list' && (
        <div className="adm-card-wrapper">
          <div className="list-filter-bar">
            {/* Status tabs */}
            <div className="filter-top-row">
              <div className="status-tab-group">
                {[
                  { label: 'Tất cả', value: '', count: reservations.length },
                  { label: 'Chờ xếp bàn', value: 'PENDING', count: pendingReservations },
                  { label: 'Đã xếp bàn', value: 'CONFIRMED', count: confirmedReservations },
                  { label: 'Đang dùng bữa', value: 'SEATED', count: seatedReservations },
                  { label: 'Đã hủy', value: 'CANCELLED', count: cancelledReservations },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterStatus(tab.value)}
                    className={`status-tab-btn ${filterStatus === tab.value ? 'active' : ''}`}
                  >
                    {tab.label}
                    <span className="status-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Search box */}
              <div className="search-field-box">
                <Search size={15} className="search-icon-inside" />
                <input
                  type="text"
                  placeholder="Tìm tên khách, SĐT, mã phiếu, số bàn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                />
              </div>
            </div>

            {/* Date filter presets */}
            <div className="filter-bottom-row">
              <div className="date-preset-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Ngày dùng bữa:</span>
                {[
                  { id: 'ALL', label: 'Tất Cả' },
                  { id: 'TODAY', label: 'Hôm Nay' },
                  { id: 'TOMORROW', label: 'Ngày Mai' },
                  { id: 'WEEK', label: '7 Ngày Tới' },
                ].map((dp) => (
                  <button
                    key={dp.id}
                    type="button"
                    onClick={() => setDateFilter(dp.id as any)}
                    className={`date-preset-btn ${dateFilter === dp.id ? 'active' : ''}`}
                  >
                    {dp.label}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{filteredReservations.length}</strong> phiếu đặt bàn
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="adm-data-table">
              <thead>
                <tr>
                  <th>Mã Phiếu</th>
                  <th>Khách Hàng</th>
                  <th>Thời Gian Dùng</th>
                  <th>Số Khách</th>
                  <th>Bàn Phục Vụ</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      Không tìm thấy đơn đặt bàn nào phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((r) => {
                    const initials = (r.customerName || 'K')
                      .split(' ')
                      .map((p) => p[0])
                      .slice(-2)
                      .join('')
                      .toUpperCase();

                    return (
                      <tr key={r.id}>
                        <td>
                          <span
                            className="code-font"
                            onClick={() => handleCopyCode(r.reservationCode)}
                            title="Bấm để sao chép mã"
                          >
                            {r.reservationCode}
                            {copiedCode === r.reservationCode ? (
                              <Check size={12} color="#10b981" />
                            ) : (
                              <Copy size={12} color="#94a3b8" />
                            )}
                          </span>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">{initials}</div>
                            <div className="customer-meta">
                              <span className="customer-name">{r.customerName}</span>
                              <span className="customer-phone">{r.customerPhone}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="time-cell">
                            <span className="time-date">
                              {new Date(r.reservationTime).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="time-hour">
                              <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                              {new Date(r.reservationTime).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="party-badge">
                            <Users size={12} /> {r.partySize} khách
                          </span>
                        </td>
                        <td>
                          {r.tableNo ? (
                            <span className="badge-assigned-table">
                              <Armchair size={13} /> {r.tableNo.startsWith('Bàn') ? r.tableNo : `Bàn ${r.tableNo}`}
                            </span>
                          ) : (
                            <span className="badge-unassigned">Chưa gán bàn</span>
                          )}
                        </td>
                        <td>
                          {r.status === 'PENDING' && (
                            <span className="status-chip chip-pending">
                              <span className="pulse-dot pulse-amber"></span> Chờ xếp bàn
                            </span>
                          )}
                          {r.status === 'CONFIRMED' && (
                            <span className="status-chip chip-confirmed">
                              <span className="pulse-dot pulse-green"></span> Đã xếp bàn
                            </span>
                          )}
                          {r.status === 'SEATED' && (
                            <span className="status-chip chip-seated">
                              <span className="pulse-dot pulse-rose"></span> Đang dùng bữa
                            </span>
                          )}
                          {r.status === 'CANCELLED' && (
                            <span className="status-chip chip-cancelled">
                              <XCircle size={12} /> Đã hủy
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-btn-group">
                            <button
                              type="button"
                              onClick={() => setDetailModal({ isOpen: true, reservation: r })}
                              className="btn-sm-action btn-detail"
                              title="Xem toàn bộ chi tiết phiếu đặt"
                            >
                              <Eye size={13} /> Chi Tiết
                            </button>

                            {r.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => setAssignModal({ isOpen: true, reservation: r, selectedTableId: '' })}
                                className="btn-sm-action btn-assign"
                              >
                                Xếp Bàn
                              </button>
                            )}

                            {r.status === 'CONFIRMED' && (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(r.id)}
                                className="btn-sm-action btn-checkin"
                              >
                                Nhận Bàn
                              </button>
                            )}

                            {r.status !== 'CANCELLED' && r.status !== 'SEATED' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelModal({
                                    isOpen: true,
                                    reservationId: r.id,
                                    reservationCode: r.reservationCode,
                                    reason: '',
                                  })
                                }
                                className="btn-sm-action btn-cancel"
                                title="Hủy phiếu đặt bàn"
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: XẾP BÀN THÔNG MINH (SMART TABLE ASSIGNMENT) ── */}
      {assignModal.isOpen && assignModal.reservation && (
        <div className="adm-modal-backdrop" onClick={() => setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' })}>
          <div className="adm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-headline">
                <Armchair size={18} color="#2563eb" /> Xếp Bàn Phục Vụ
              </h3>
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' })}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mã phiếu:</span>
                  <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{assignModal.reservation.reservationCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Khách hàng:</span>
                  <strong>{assignModal.reservation.customerName} ({assignModal.reservation.customerPhone})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Quy mô:</span>
                  <strong style={{ color: '#e11d48' }}>{assignModal.reservation.partySize} khách</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Giờ dùng bữa:</span>
                  <span>
                    {new Date(assignModal.reservation.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                    - {new Date(assignModal.reservation.reservationTime).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {assignModal.reservation.specialNotes && (
                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem', color: '#92400e' }}>
                    <strong>Ghi chú:</strong> {assignModal.reservation.specialNotes}
                  </div>
                )}
              </div>

              <div className="modal-field-block">
                <label>Chọn bàn phục vụ phù hợp:</label>
                <select
                  value={assignModal.selectedTableId}
                  onChange={(e) => setAssignModal({ ...assignModal, selectedTableId: e.target.value })}
                  className="modal-select-control"
                >
                  <option value="">-- Bấm để chọn bàn trống đủ chỗ --</option>
                  {tables
                    .filter((t) => t.capacity >= (assignModal.reservation?.partySize || 0))
                    .map((t) => {
                      const isAvail = t.status?.toLowerCase() === 'available';
                      const zone = getTableZone(t);
                      const name = getTableName(t);
                      return (
                        <option key={t.id} value={t.id}>
                          {name} ({t.capacity} chỗ) - {zone.name} - [{isAvail ? '🟢 Bàn Trống' : '⚠️ ' + t.status.toUpperCase()}]
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' })}
                className="btn-secondary-action"
              >
                Hủy
              </button>
              <button type="button" onClick={handleAssignTable} className="btn-primary-action">
                Xác Nhận Xếp Chỗ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHI TIẾT PHIẾU ĐẶT BÀN (DETAIL MODAL) ── */}
      {detailModal.isOpen && detailModal.reservation && (
        <div className="adm-modal-backdrop" onClick={() => setDetailModal({ isOpen: false, reservation: null })}>
          <div className="adm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-headline">
                <Sparkles size={18} color="#f59e0b" /> Chi Tiết Phiếu Đặt Bàn
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, reservation: null })}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Mã Đặt Chỗ</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#2563eb' }}>
                    {detailModal.reservation.reservationCode}
                  </div>
                </div>
                <div>
                  {detailModal.reservation.status === 'PENDING' && <span className="status-chip chip-pending">Chờ xếp bàn</span>}
                  {detailModal.reservation.status === 'CONFIRMED' && <span className="status-chip chip-confirmed">Đã xếp bàn</span>}
                  {detailModal.reservation.status === 'SEATED' && <span className="status-chip chip-seated">Đang dùng bữa</span>}
                  {detailModal.reservation.status === 'CANCELLED' && <span className="status-chip chip-cancelled">Đã hủy</span>}
                </div>
              </div>

              <div className="detail-info-grid">
                <div className="detail-item-box">
                  <span className="detail-item-label">Khách Hàng</span>
                  <span className="detail-item-value">{detailModal.reservation.customerName}</span>
                </div>
                <div className="detail-item-box">
                  <span className="detail-item-label">Số Điện Thoại</span>
                  <span className="detail-item-value" style={{ color: '#2563eb' }}>
                    {detailModal.reservation.customerPhone}
                  </span>
                </div>
                <div className="detail-item-box">
                  <span className="detail-item-label">Thời Gian Đến</span>
                  <span className="detail-item-value">
                    {new Date(detailModal.reservation.reservationTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                    - {new Date(detailModal.reservation.reservationTime).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="detail-item-box">
                  <span className="detail-item-label">Số Lượng Thực Khách</span>
                  <span className="detail-item-value" style={{ color: '#e11d48' }}>
                    {detailModal.reservation.partySize} người
                  </span>
                </div>
                <div className="detail-item-box" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-item-label">Bàn Phục Vụ</span>
                  <span className="detail-item-value" style={{ color: '#059669' }}>
                    {detailModal.reservation.tableNo
                      ? detailModal.reservation.tableNo.startsWith('Bàn')
                        ? detailModal.reservation.tableNo
                        : `Bàn ${detailModal.reservation.tableNo}`
                      : 'Chưa phân bổ bàn'}
                  </span>
                </div>
              </div>

              {detailModal.reservation.specialNotes && (
                <div className="detail-notes-box">
                  <span className="detail-notes-title">Ghi Chú Đặt Bàn & Yêu Cầu Riêng:</span>
                  <div className="detail-notes-content">{detailModal.reservation.specialNotes}</div>
                </div>
              )}
            </div>

            <div className="modal-footer-btns">
              {detailModal.reservation.status === 'CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => handleCheckIn(detailModal.reservation!.id)}
                  className="btn-primary-action"
                  style={{ background: '#059669' }}
                >
                  <CheckCircle2 size={15} /> Khách Đến Nhận Bàn
                </button>
              )}

              {detailModal.reservation.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    const r = detailModal.reservation!;
                    setDetailModal({ isOpen: false, reservation: null });
                    setAssignModal({ isOpen: true, reservation: r, selectedTableId: '' });
                  }}
                  className="btn-primary-action"
                >
                  <Armchair size={15} /> Xếp Bàn Ngay
                </button>
              )}

              {detailModal.reservation.status !== 'CANCELLED' && detailModal.reservation.status !== 'SEATED' && (
                <button
                  type="button"
                  onClick={() => {
                    const r = detailModal.reservation!;
                    setDetailModal({ isOpen: false, reservation: null });
                    setCancelModal({ isOpen: true, reservationId: r.id, reservationCode: r.reservationCode, reason: '' });
                  }}
                  className="btn-danger-action"
                >
                  Hủy Đơn
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetailModal({ isOpen: false, reservation: null })}
                className="btn-secondary-action"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: HỦY ĐẶT BÀN CÓ LÝ DO (CANCEL MODAL) ── */}
      {cancelModal.isOpen && (
        <div className="adm-modal-backdrop" onClick={() => setCancelModal({ isOpen: false, reservationId: '', reservationCode: '', reason: '' })}>
          <div className="adm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-headline" style={{ color: '#e11d48' }}>
                <AlertCircle size={18} /> Hủy Phiếu Đặt Bàn {cancelModal.reservationCode}
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, reservationId: '', reservationCode: '', reason: '' })}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <p className="modal-subtext">
                Vui lòng chọn hoặc nhập lý do hủy đặt chỗ để lưu lại lịch sử đối soát của nhà hàng:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Khách gọi điện báo bận / dời lịch',
                  'Quá 30 phút so với giờ hẹn khách không đến',
                  'Khách đổi sang dùng bữa tại chi nhánh khác',
                  'Nhà hàng hết bàn hoặc quá tải khung giờ này',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCancelModal((prev) => ({ ...prev, reason: preset }))}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: cancelModal.reason === preset ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
                      background: cancelModal.reason === preset ? '#fff1f2' : '#ffffff',
                      color: cancelModal.reason === preset ? '#be123c' : '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    • {preset}
                  </button>
                ))}
              </div>

              <div className="modal-field-block">
                <label>Lý do chi tiết (nếu có):</label>
                <textarea
                  rows={3}
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  placeholder="Nhập lý do cụ thể..."
                  className="modal-textarea-control"
                />
              </div>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, reservationId: '', reservationCode: '', reason: '' })}
                className="btn-secondary-action"
              >
                Giữ Lại Đơn
              </button>
              <button type="button" onClick={handleConfirmCancel} className="btn-danger-action">
                Xác Nhận Hủy Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: TẠO ĐẶT BÀN OFFLINE / HOTLINE ── */}
      {offlineModal && (
        <div className="adm-modal-backdrop" onClick={() => setOfflineModal(false)}>
          <div className="adm-modal-box modal-width-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-headline">
                <Plus size={18} color="#ea580c" /> Tạo Phiếu Đặt Bàn (Tại Chỗ / Hotline)
              </h3>
              <button type="button" onClick={() => setOfflineModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOffline}>
              <div className="modal-body-content">
                <div className="grid-2col">
                  <div className="modal-field-block">
                    <label>Tên khách hàng *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Anh Hoàng Anh"
                      value={offlineForm.customerName}
                      onChange={(e) => setOfflineForm({ ...offlineForm, customerName: e.target.value })}
                      className="modal-input-control"
                    />
                  </div>
                  <div className="modal-field-block">
                    <label>Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912345678"
                      value={offlineForm.customerPhone}
                      onChange={(e) => setOfflineForm({ ...offlineForm, customerPhone: e.target.value })}
                      className="modal-input-control"
                    />
                  </div>
                </div>

                <div className="modal-field-block">
                  <label>Email khách hàng (nhận xác nhận qua thư):</label>
                  <input
                    type="email"
                    placeholder="VD: hoanganh@gmail.com (tùy chọn)"
                    value={offlineForm.customerEmail}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customerEmail: e.target.value })}
                    className="modal-input-control"
                  />
                </div>

                <div className="grid-3col">
                  <div className="modal-field-block">
                    <label>Số lượng khách *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={offlineForm.partySize}
                      onChange={(e) => setOfflineForm({ ...offlineForm, partySize: Number(e.target.value) })}
                      className="modal-input-control"
                    />
                    <div className="party-preset-chips">
                      {[2, 4, 6, 8].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setOfflineForm({ ...offlineForm, partySize: size })}
                          className={`preset-chip ${offlineForm.partySize === size ? 'active' : ''}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="modal-field-block">
                    <label>Ngày dùng bữa *</label>
                    <input
                      type="date"
                      required
                      value={offlineForm.reservationDate}
                      onChange={(e) => setOfflineForm({ ...offlineForm, reservationDate: e.target.value })}
                      className="modal-input-control"
                    />
                  </div>
                  <div className="modal-field-block">
                    <label>Giờ dùng bữa *</label>
                    <input
                      type="time"
                      required
                      value={offlineForm.reservationTime}
                      onChange={(e) => setOfflineForm({ ...offlineForm, reservationTime: e.target.value })}
                      className="modal-input-control"
                    />
                  </div>
                </div>

                <div className="modal-field-block">
                  <label>Chọn bàn phục vụ:</label>
                  <select
                    value={offlineForm.tableId}
                    onChange={(e) => setOfflineForm({ ...offlineForm, tableId: e.target.value })}
                    className="modal-select-control"
                  >
                    <option value="">-- Chưa chỉ định bàn (Sẽ xếp sau) --</option>
                    {tables
                      .filter((t) => t.capacity >= offlineForm.partySize)
                      .map((t) => {
                        const isAvail = t.status?.toLowerCase() === 'available';
                        const zone = getTableZone(t);
                        const name = getTableName(t);
                        return (
                          <option key={t.id} value={t.id}>
                            {name} ({t.capacity} chỗ) - {zone.name} - [{isAvail ? '🟢 Trống' : '⚠️ ' + t.status.toUpperCase()}]
                          </option>
                        );
                      })}
                  </select>
                </div>

                {offlineForm.tableId && (
                  <div className="modal-checkbox-row">
                    <input
                      type="checkbox"
                      id="seatedImmediately"
                      checked={offlineForm.seatedImmediately}
                      onChange={(e) => setOfflineForm({ ...offlineForm, seatedImmediately: e.target.checked })}
                    />
                    <label htmlFor="seatedImmediately">
                      Khách đã có mặt và vào bàn ăn ngay (Check-in luôn mà không cần chờ)
                    </label>
                  </div>
                )}

                <div className="modal-field-block">
                  <label>Ghi chú đặc biệt:</label>
                  <textarea
                    rows={2}
                    value={offlineForm.specialNotes}
                    onChange={(e) => setOfflineForm({ ...offlineForm, specialNotes: e.target.value })}
                    placeholder="VD: Khách yêu cầu ghế trẻ em, dị ứng hải sản, bàn gần cửa kính view phố..."
                    className="modal-textarea-control"
                  />
                </div>
              </div>

              <div className="modal-footer-btns">
                <button type="button" onClick={() => setOfflineModal(false)} className="btn-secondary-action">
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn-primary-action" style={{ background: '#ea580c' }}>
                  Xác Nhận Tạo Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationManagement;
