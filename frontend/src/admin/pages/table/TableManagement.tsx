import React, { useState } from 'react';
import { Users, Search, Plus } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';

export const TableManagement: React.FC = () => {
  const { tables } = useAdminStore();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTables = tables.filter((t) => {
    return filterStatus === 'ALL' || t.status === filterStatus;
  });

  const availableCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;
  const reservedCount = tables.filter((t) => t.status === 'RESERVED').length;
  const cleaningCount = tables.filter((t) => t.status === 'CLEANING').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Action Header Toolbar (Below Top Header) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Sơ Đồ Bàn & Đặt Bàn Live
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Quản lý trực quan vị trí bàn, trạng thái sử dụng và doanh thu tức thời tại bàn
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '260px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input type="text" className="search-input" placeholder="Tìm kiếm bàn, vị trí..." />
          </div>

          <button className="btn btn-primary">
            <Plus size={16} />
            <span>Tạo Đơn Hàng Mới</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges & Controls */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        {filteredTables.map((tbl) => (
          <div
            key={tbl.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              borderTop: `4px solid ${
                tbl.status === 'AVAILABLE'
                  ? 'var(--success)'
                  : tbl.status === 'OCCUPIED'
                  ? 'var(--danger)'
                  : tbl.status === 'RESERVED'
                  ? 'var(--info)'
                  : 'var(--warning)'
              }`,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            {/* Table Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
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
                  {tbl.tableNo.replace('Bàn ', '')}
                </div>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {tbl.tableNo}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Users size={12} /> {tbl.capacity} ghế
                  </div>
                </div>
              </div>

              <StatusBadge status={tbl.status} size="sm" />
            </div>

            {/* Middle Content */}
            <div
              style={{
                backgroundColor: 'var(--bg-app)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                minHeight: '60px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {tbl.status === 'OCCUPIED' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tạm tính:</span>
                    <strong style={{ color: 'var(--danger)', fontWeight: 800 }}>
                      {tbl.currentOrderAmount?.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span>Thời gian:</span>
                    <span>{tbl.occupiedSince}</span>
                  </div>
                </>
              ) : tbl.status === 'RESERVED' ? (
                <span style={{ color: 'var(--info)', fontWeight: 600 }}>
                  📅 Khách hẹn 19:30 (Anh Đức)
                </span>
              ) : tbl.status === 'CLEANING' ? (
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                  🧹 Bàn cần lau dọn sau khi thanh toán
                </span>
              ) : (
                <span style={{ color: 'var(--success)', fontWeight: 600, textAlign: 'center' }}>
                  ✨ Bàn sẵn sàng đón khách
                </span>
              )}
            </div>

            {/* Quick Action Bar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {tbl.status === 'AVAILABLE' && (
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  Tạo Đơn Tại Bàn
                </button>
              )}
              {tbl.status === 'OCCUPIED' && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  In Hóa Đơn / Thêm Món
                </button>
              )}
              {tbl.status === 'CLEANING' && (
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  Đã Dọn Xong
                </button>
              )}
              {tbl.status === 'RESERVED' && (
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                  Xếp Khách Vào Bàn
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
