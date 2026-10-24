import React, { useState, useEffect } from 'react';
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

export function ReservationManagement(): React.ReactElement {
  // 'map' (Xem sơ đồ bàn) | 'list' (Xem danh sách bảng dữ liệu)
  const [activeMode, setActiveMode] = useState<'map' | 'list'>('map');

  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal Xếp bàn
  const [assignModal, setAssignModal] = useState<AssignModalState>({
    isOpen: false,
    reservation: null,
    selectedTableId: '',
  });

  // Modal Đặt bàn Offline
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
      console.error('Lỗi làm mới dữ liệu:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
      await refreshData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleCheckIn = async (id: string) => {
    if (!window.confirm('Xác nhận khách đã vào nhận bàn?')) return;
    try {
      await reservationApi.checkIn(id);
      alert('Khách đã vào bàn thành công!');
      await refreshData();
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
      await refreshData();
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
      await refreshData();
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const totalTables = tables.length;
  const availTables = tables.filter((t) => t.status?.toLowerCase() === 'available').length;
  const occupiedTables = tables.filter((t) => t.status?.toLowerCase() === 'occupied').length;
  const pendingReservations = reservations.filter((r) => r.status === 'PENDING').length;

  const filteredReservations = reservations.filter(
    (r) =>
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerPhone.includes(searchTerm) ||
      r.reservationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="adm-res-container animate-fade-in">
      {/* ── TOP HEADER ── */}
      <div className="adm-res-header">
        <div>
          <h1 className="adm-res-title">Quản Lý Đặt Bàn & Sơ Đồ Phục Vụ</h1>
          <p className="adm-res-subtitle">
            Theo dõi trạng thái bàn ăn thời gian thực và điều phối đơn đặt bàn của khách toàn hệ thống
          </p>
        </div>

        <div className="adm-res-actions">
          {/* Nút chuyển đổi View: Sơ đồ bàn <-> Danh sách bảng */}
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
            onClick={refreshData}
            className="adm-refresh-btn"
            title="Làm mới dữ liệu"
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

      {/* ── THẺ THỐNG KÊ NHANH ── */}
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
          <span className="stat-label">Đơn Online Chờ Xếp</span>
          <div className="stat-value">{pendingReservations}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHẾ ĐỘ 1: SƠ ĐỒ BÀN TRỰC QUAN (FLOOR MAP)
          ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'map' && (
        <div className="adm-card-wrapper">
          <div className="map-toolbar">
            <h3 className="section-heading">Sơ Đồ Bàn Ăn Trực Quan</h3>
            <div className="map-legends">
              <span className="map-legend-item">
                <span className="legend-dot dot-green"></span> Bàn trống (Bấm để tạo đơn)
              </span>
              <span className="map-legend-item">
                <span className="legend-dot dot-yellow"></span> Đã đặt trước
              </span>
              <span className="map-legend-item">
                <span className="legend-dot dot-red"></span> Đang dùng bữa
              </span>
            </div>
          </div>

          <div className="adm-table-grid">
            {tables.map((t) => {
              const isAvailable = t.status?.toLowerCase() === 'available';
              const isOccupied = t.status?.toLowerCase() === 'occupied';

              // Tìm đơn đặt bàn tương ứng đã xếp cho bàn này (nếu có)
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

                  {/* Thông tin khách nếu bàn đã có người đặt trước */}
                  {reservedOrder && (
                    <div className="floor-guest-info">
                      <div className="guest-name">
                        <User size={13} /> {reservedOrder.customerName}
                      </div>
                      <div className="guest-time">
                        <Clock size={12} />{' '}
                        {new Date(reservedOrder.reservationTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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

                  {isAvailable && <span className="click-to-book-hint">+ Đặt bàn này</span>}
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
          {/* Thanh công cụ lọc & tìm kiếm */}
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

          {/* Bảng dữ liệu */}
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
                    <td colSpan={7} className="empty-table-cell">
                      Không tìm thấy đơn đặt bàn nào
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((r) => (
                    <tr key={r.id}>
                      <td className="code-font">{r.reservationCode}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.customerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.customerPhone}</div>
                      </td>
                      <td>
                        <div>{new Date(r.reservationTime).toLocaleDateString('vi-VN')}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {new Date(r.reservationTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="text-center" style={{ fontWeight: 800 }}>
                        {r.partySize}
                      </td>
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
              Khách hàng: <strong>{assignModal.reservation.customerName}</strong> ({assignModal.reservation.partySize}{' '}
              người)
            </p>

            <div className="modal-field-block">
              <label>Chọn bàn khả dụng:</label>
              <select
                value={assignModal.selectedTableId}
                onChange={(e) => setAssignModal({ ...assignModal, selectedTableId: e.target.value })}
                className="modal-select-control"
              >
                <option value="">-- Bấm để chọn bàn trống --</option>
                {tables
                  .filter((t) => t.capacity >= (assignModal.reservation?.partySize || 0))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.tableNo} - Sức chứa: {t.capacity} người ({t.status})
                    </option>
                  ))}
              </select>
            </div>

            <div className="modal-footer-btns">
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, reservation: null, selectedTableId: '' })}
                className="btn-secondary"
              >
                Đóng
              </button>
              <button type="button" onClick={handleAssignTable} className="btn-primary-action">
                Xác Nhận Xếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TẠO ĐẶT BÀN OFFLINE ── */}
      {offlineModal && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal-box modal-width-lg">
            <h3 className="modal-headline">Tạo Đặt Bàn Offline / Hotline</h3>
            <form onSubmit={handleCreateOffline} className="modal-styled-form">
              <div className="grid-2col">
                <div className="modal-field-block">
                  <label>Tên khách hàng *</label>
                  <input
                    type="text"
                    required
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
                    value={offlineForm.customerPhone}
                    onChange={(e) => setOfflineForm({ ...offlineForm, customerPhone: e.target.value })}
                    className="modal-input-control"
                  />
                </div>
              </div>

              <div className="grid-3col">
                <div className="modal-field-block">
                  <label>Số khách *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={offlineForm.partySize}
                    onChange={(e) => setOfflineForm({ ...offlineForm, partySize: Number(e.target.value) })}
                    className="modal-input-control"
                  />
                </div>
                <div className="modal-field-block">
                  <label>Ngày đến *</label>
                  <input
                    type="date"
                    required
                    value={offlineForm.reservationDate}
                    onChange={(e) => setOfflineForm({ ...offlineForm, reservationDate: e.target.value })}
                    className="modal-input-control"
                  />
                </div>
                <div className="modal-field-block">
                  <label>Giờ đến *</label>
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
                <label>Chọn bàn phục vụ (Tùy chọn):</label>
                <select
                  value={offlineForm.tableId}
                  onChange={(e) => setOfflineForm({ ...offlineForm, tableId: e.target.value })}
                  className="modal-select-control"
                >
                  <option value="">-- Chưa gán bàn (Xếp sau) --</option>
                  {tables
                    .filter((t) => t.capacity >= offlineForm.partySize)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Bàn {t.tableNo} ({t.capacity} chỗ - {t.status})
                      </option>
                    ))}
                </select>
              </div>

              {offlineForm.tableId && (
                <div className="modal-checkbox-row">
                  <input
                    type="checkbox"
                    id="seatedImmediately"
                    checked={offlineForm.seatedImmediately}
                    onChange={(e) => setOfflineForm({ ...offlineForm, seatedImmediately: e.target.checked })}
                    className="checkbox-custom"
                  />
                  <label htmlFor="seatedImmediately">Khách vào ngồi ăn ngay (Walk-in check-in luôn)</label>
                </div>
              )}

              <div className="modal-footer-btns">
                <button type="button" onClick={() => setOfflineModal(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action">
                  Tạo Đơn
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
