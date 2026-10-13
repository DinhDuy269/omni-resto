import React, { useState } from 'react';
import { Users, Search, Plus, Trash2, Edit3, CheckCircle2, Clock, QrCode, RefreshCw, Copy, ExternalLink, Printer, ShieldCheck, Bell, CreditCard } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import type { TableInfo, TableStatus } from '../../../shared/types/admin';

export const TableManagement: React.FC = () => {
  const {
    tables,
    updateTableStatus,
    addTable,
    deleteTable,
    updateTable,
    regenerateTableQrToken,
    verifyTableSession,
    setTablePaymentRequested,
    confirmTablePayment,
    service_requests,
    resolveServiceRequestsByTable,
  } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableInfo | null>(null);
  const [qrModalTable, setQrModalTable] = useState<TableInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const [tableForm, setTableForm] = useState({
    table_no: '',
    capacity: 4,
    status: 'AVAILABLE' as TableStatus,
  });

  const filteredTables = tables.filter((t) => {
    const matchesFilter = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch = t.table_no.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const reservedCount = tables.filter((t) => t.status === 'RESERVED').length;
  const cleaningCount = tables.filter((t) => t.status === 'CLEANING').length;

  const handleOpenAddModal = () => {
    const nextTableNum = tables.length + 1;
    setTableForm({
      table_no: `Bàn ${nextTableNum < 10 ? '0' + nextTableNum : nextTableNum}`,
      capacity: 4,
      status: 'AVAILABLE',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (tbl: TableInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTable(tbl);
    setTableForm({
      table_no: tbl.table_no,
      capacity: tbl.capacity,
      status: tbl.status,
    });
  };

  const handleSubmitAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.table_no) return;

    addTable({
      table_no: tableForm.table_no,
      capacity: Number(tableForm.capacity),
      status: tableForm.status,
    });
    setIsAddModalOpen(false);
  };

  const handleSubmitEditTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !tableForm.table_no) return;

    updateTable({
      ...editingTable,
      table_no: tableForm.table_no,
      capacity: Number(tableForm.capacity),
      status: tableForm.status,
    });
    setEditingTable(null);
  };

  const handleDeleteTable = (id: string, table_no: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${table_no}"?`)) {
      deleteTable(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Sơ Đồ Bàn & Đặt Bàn Live
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Quản lý trực quan sơ đồ bàn ăn, điều phối nhận khách và theo dõi tạm tính theo thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '260px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm bàn (Bàn 01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Thêm Bàn Mới</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges & Controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ALL')}
          >
            Tất Cả ({tables.length} Bàn)
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'AVAILABLE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('AVAILABLE')}
          >
            Bàn Trống ({availableCount})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'OCCUPIED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('OCCUPIED')}
          >
            Có Khách ({occupiedCount})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'RESERVED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('RESERVED')}
          >
            Đã Đặt Trước ({reservedCount})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'CLEANING' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('CLEANING')}
          >
            Cần Dọn ({cleaningCount})
          </button>
        </div>
      </div>

      {/* Interactive Visual Table Floor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {filteredTables.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Không tìm thấy bàn nào phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const activeTableCalls = service_requests.filter(
              (sr) => sr.table_no.toLowerCase() === tbl.table_no.toLowerCase() && sr.status === 'OPEN'
            );
            const isFrozenForPayment = tbl.payment_requested;
            const isAwaitingVerification = tbl.status === 'OCCUPIED' && tbl.is_verified === false;

            return (
              <div
                key={tbl.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  borderTop: isFrozenForPayment
                    ? '4px solid #2563eb'
                    : activeTableCalls.length > 0
                    ? '4px solid #ef4444'
                    : `4px solid ${
                        tbl.status === 'AVAILABLE'
                          ? 'var(--success)'
                          : tbl.status === 'OCCUPIED'
                          ? 'var(--danger)'
                          : tbl.status === 'RESERVED'
                          ? 'var(--info)'
                          : 'var(--warning)'
                      }`,
                  border: isFrozenForPayment ? '1.5px solid #3b82f6' : activeTableCalls.length > 0 ? '1.5px solid #ef4444' : undefined,
                  boxShadow: isFrozenForPayment ? '0 0 16px rgba(59, 130, 246, 0.2)' : activeTableCalls.length > 0 ? '0 0 16px rgba(239, 68, 68, 0.2)' : undefined,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Table Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      {tbl.table_no.replace('Bàn ', '')}
                    </div>
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        {tbl.table_no}
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> {tbl.capacity} ghế ngồi
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <StatusBadge status={tbl.status} size="sm" />
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Xem & In mã QR bàn bảo mật"
                      style={{ padding: '4px', color: 'var(--primary)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrModalTable(tbl);
                        setCopied(false);
                      }}
                    >
                      <QrCode size={14} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Sửa bàn"
                      style={{ padding: '4px' }}
                      onClick={(e) => handleOpenEditModal(tbl, e)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm btn-icon"
                      title="Xóa bàn"
                      style={{ padding: '4px', color: 'var(--danger)' }}
                      onClick={(e) => handleDeleteTable(tbl.id, tbl.table_no, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Service Calls Alert */}
                {activeTableCalls.length > 0 && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#be123c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bell size={13} />
                      <span>{activeTableCalls[activeTableCalls.length - 1].request_text}</span>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', background: '#be123c', color: '#ffffff', border: 'none' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveServiceRequestsByTable(tbl.table_no);
                      }}
                    >
                      Đã phục vụ
                    </button>
                  </div>
                )}

                {/* Session Verification Alert */}
                {isAwaitingVerification && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 700 }}>
                      <span>⏳ Chờ xác nhận bàn</span>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#d97706', color: '#ffffff', border: 'none', fontWeight: 800 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        verifyTableSession(tbl.table_no);
                      }}
                    >
                      🛡️ Xác nhận bàn
                    </button>
                  </div>
                )}

                {/* Payment Request Alert */}
                {isFrozenForPayment && (
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={13} />
                      <span>Khách xin hóa đơn (Đã chốt)</span>
                    </div>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#ffffff', color: '#1e40af', border: '1px solid #bfdbfe' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTablePaymentRequested(tbl.table_no, false);
                      }}
                      title="Mở lại cho khách gọi thêm"
                    >
                      Mở lại
                    </button>
                  </div>
                )}

                {/* Middle Content */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    minHeight: '68px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {tbl.status === 'OCCUPIED' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tạm tính:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {tbl.is_paid && (
                            <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              ✓ Đã thu
                            </span>
                          )}
                          <strong style={{ color: tbl.is_paid ? 'var(--success)' : 'var(--danger)', fontWeight: 800, fontSize: '1rem' }}>
                            {(tbl.current_order_amount || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Thời gian:
                        </span>
                        <span>{tbl.occupied_since || 'Đang dùng bữa'}</span>
                      </div>
                    </>
                  ) : tbl.status === 'RESERVED' ? (
                    <span style={{ color: 'var(--info)', fontWeight: 600 }}>
                      📅 Bàn đã có khách đặt trước
                    </span>
                  ) : tbl.status === 'CLEANING' ? (
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      🧹 Bàn cần lau dọn sau khi thanh toán
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                      ✨ Bàn trống, sẵn sàng đón khách
                    </span>
                  )}
                </div>

                {/* Quick Action Bar with Real Functionality */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {tbl.status === 'AVAILABLE' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => updateTableStatus(tbl.id, 'OCCUPIED')}
                    >
                      Mở Bàn / Nhận Khách
                    </button>
                  )}
                  {tbl.status === 'OCCUPIED' && (
                    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                      {!tbl.is_paid ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              flex: 1.2,
                              background: isFrozenForPayment ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#059669',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                            title="Xác nhận khách đã thanh toán hóa đơn"
                            onClick={() => {
                              if (window.confirm(`Xác nhận đã nhận đủ ${(tbl.current_order_amount || 0).toLocaleString('vi-VN')} đ cho ${tbl.table_no}?`)) {
                                confirmTablePayment(tbl.table_no);
                              }
                            }}
                          >
                            <CreditCard size={13} />
                            <span>{isFrozenForPayment ? '💵 Thu Tiền' : 'Xác Nhận Thu'}</span>
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 0.8, fontSize: '0.75rem' }}
                            title="Đóng phiên bàn và dọn dẹp"
                            onClick={() => {
                              if (window.confirm(`Chuyển ${tbl.table_no} sang trạng thái dọn bàn? Phiên của khách sẽ đóng.`)) {
                                updateTableStatus(tbl.id, 'CLEANING');
                                setTablePaymentRequested(tbl.table_no, false);
                                fetch(`/api/table-sessions/close?tableId=${tbl.id}`, { method: 'POST' }).catch(() => {});
                                window.dispatchEvent(new CustomEvent('omniresto:table_session_closed', { detail: { tableId: tbl.id, reason: 'ADMIN_CHECKOUT' } }));
                              }
                            }}
                          >
                            🧹 Trả Bàn
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: '0.72rem', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                            title="Mở khóa bàn cho thiết bị mới quét nếu khách hết pin hoặc gặp sự cố"
                            onClick={() => {
                              if (window.confirm(`Mở khóa phiên cho ${tbl.table_no}? Khóa thiết bị cũ sẽ bị hủy để thiết bị mới có thể quét mã QR.`)) {
                                fetch(`/api/table-sessions/close?tableId=${tbl.id}&reason=STAFF_DEVICE_UNLOCK`, { method: 'POST' }).catch(() => {});
                                updateTableStatus(tbl.id, 'AVAILABLE');
                                setTablePaymentRequested(tbl.table_no, false);
                                window.dispatchEvent(new CustomEvent('omniresto:table_session_closed', { detail: { tableId: tbl.id, reason: 'STAFF_DEVICE_UNLOCK' } }));
                              }
                            }}
                          >
                            🔓 Mở Khóa Bàn
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            background: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                          onClick={() => {
                            if (window.confirm(`Khách ${tbl.table_no} đã rời bàn. Chuyển sang Cần Dọn Dẹp?`)) {
                              updateTableStatus(tbl.id, 'CLEANING');
                              fetch(`/api/table-sessions/close?tableId=${tbl.id}`, { method: 'POST' }).catch(() => {});
                              window.dispatchEvent(new CustomEvent('omniresto:table_session_closed', { detail: { tableId: tbl.id, reason: 'ADMIN_CHECKOUT' } }));
                            }
                          }}
                        >
                          <span>🧹 Khách Rời Bàn & Dọn Dẹp</span>
                        </button>
                      )}
                    </div>
                  )}
                  {tbl.status === 'CLEANING' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        updateTableStatus(tbl.id, 'AVAILABLE');
                        fetch(`/api/table-sessions/close?tableId=${tbl.id}`, { method: 'POST' }).catch(() => {});
                        window.dispatchEvent(new CustomEvent('omniresto:table_session_closed', { detail: { tableId: tbl.id, reason: 'CLEANING_COMPLETED' } }));
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Đã Dọn Xong</span>
                    </button>
                  )}
                  {tbl.status === 'RESERVED' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => updateTableStatus(tbl.id, 'OCCUPIED')}
                    >
                      Xếp Khách Vào Bàn
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Thêm Bàn Mới */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Thêm Bàn Ăn Mới">
        <form onSubmit={handleSubmitAddTable}>
          <div className="form-group">
            <label className="form-label">Tên / Ký Hiệu Bàn*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Bàn 13, Bàn VIP 01..."
              required
              value={tableForm.table_no}
              onChange={(e) => setTableForm({ ...tableForm, table_no: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Số Ghế Ngồi (Sức Chứa)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={30}
                required
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trạng Thái Ban Đầu*</label>
              <select
                className="form-select"
                value={tableForm.status}
                onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
              >
                <option value="AVAILABLE">Trống (Sẵn sàng)</option>
                <option value="OCCUPIED">Đang có khách</option>
                <option value="RESERVED">Đã đặt trước</option>
                <option value="CLEANING">Cần dọn dẹp</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo Bàn
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chỉnh Sửa Bàn */}
      <Modal isOpen={!!editingTable} onClose={() => setEditingTable(null)} title="Chỉnh Sửa Thông Tin Bàn Ăn">
        <form onSubmit={handleSubmitEditTable}>
          <div className="form-group">
            <label className="form-label">Tên / Ký Hiệu Bàn*</label>
            <input
              type="text"
              className="form-input"
              required
              value={tableForm.table_no}
              onChange={(e) => setTableForm({ ...tableForm, table_no: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Số Ghế Ngồi (Sức Chứa)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={30}
                required
                value={tableForm.capacity}
                onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trạng Thái Bàn*</label>
              <select
                className="form-select"
                value={tableForm.status}
                onChange={(e) => setTableForm({ ...tableForm, status: e.target.value as TableStatus })}
              >
                <option value="AVAILABLE">Trống (Sẵn sàng)</option>
                <option value="OCCUPIED">Đang có khách</option>
                <option value="RESERVED">Đã đặt trước</option>
                <option value="CLEANING">Cần dọn dẹp</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingTable(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Mã QR Bàn Ăn Bảo Mật */}
      {qrModalTable && (
        <Modal
          isOpen={!!qrModalTable}
          onClose={() => setQrModalTable(null)}
          title={`Mã QR Gọi Món Tại Bàn — ${qrModalTable.table_no}`}
        >
          {(() => {
            const token = qrModalTable.qr_secret_token || `qr-token-${qrModalTable.id}-default`;
            const checkInUrl = `${window.location.origin}/client/scan?token=${token}`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkInUrl)}`;

            return (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  padding: '4px 12px', borderRadius: 99,
                  fontSize: '0.78rem', color: '#166534', fontWeight: 700,
                  marginBottom: 16,
                }}>
                  <ShieldCheck size={14} /> Chống đổi số bàn trên URL & Ngăn chặn đặt món từ xa
                </div>

                <div style={{
                  background: '#fff', border: '2px dashed var(--border-color)',
                  borderRadius: 16, padding: 20, display: 'inline-block',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 16,
                }}>
                  <img
                    src={qrImageUrl}
                    alt={`QR ${qrModalTable.table_no}`}
                    style={{ width: 220, height: 220, display: 'block', margin: '0 auto' }}
                  />
                  <div style={{ marginTop: 12, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {qrModalTable.table_no}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Quét để kích hoạt phiên gọi món
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px',
                  }}>
                    {checkInUrl}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, padding: '4px 10px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(checkInUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy size={13} />
                    <span>{copied ? 'Đã chép!' : 'Chép'}</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => window.open(checkInUrl, '_blank')}
                  >
                    <ExternalLink size={14} />
                    <span>Mở Thử Tab Mới</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => window.print()}
                  >
                    <Printer size={14} />
                    <span>In Mã Dán Bàn</span>
                  </button>
                </div>

                {/* Revoke & Regenerate QR Token in case it was photographed and abused */}
                <button
                  type="button"
                  style={{
                    background: 'none', border: '1px dashed var(--danger)',
                    color: 'var(--danger)', borderRadius: 8, padding: '8px 12px',
                    fontSize: '0.78rem', cursor: 'pointer', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onClick={() => {
                    if (window.confirm(`Đổi mã QR mới cho ${qrModalTable.table_no}? Mã QR cũ đã in sẽ lập tức bị vô hiệu hóa để bảo vệ bàn ăn.`)) {
                      regenerateTableQrToken(qrModalTable.id);
                      const updated = tables.find((t) => t.id === qrModalTable.id);
                      if (updated) setQrModalTable(updated);
                    }
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Thu hồi & Đổi mã QR mới (Nếu mã cũ bị chụp trộm)</span>
                </button>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
};
