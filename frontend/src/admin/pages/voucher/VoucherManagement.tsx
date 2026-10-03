import React from 'react';
import { Search, Plus, Ticket } from 'lucide-react';
import { VoucherCard } from './components/VoucherCard';
import { useVoucher } from './hooks/useVoucher';

// Component giả lập. Trong thực tế bạn có thể truyền data thật từ API vào useVoucher
export const VoucherManagement: React.FC = () => {
  const {
    vouchers,
    summaryCount,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    toggleVoucherStatus
  } = useVoucher();

  const handleCreateNew = () => {
    // Logic mở Modal tạo mới voucher
    console.log("Mở form tạo voucher");
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page Action Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={24} color="var(--primary)" />
            Quản Lý Khuyến Mãi & Voucher
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Thiết lập mã giảm giá, kiểm soát lượt sử dụng và kích cầu doanh số
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ width: '280px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-app)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.875rem' }}
              placeholder="Tìm theo mã code hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleCreateNew}>
            <Plus size={16} />
            <span>Thêm Khuyến Mãi</span>
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
            Tất Cả ({summaryCount.all})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'ACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('ACTIVE')}
          >
            Đang Hoạt Động ({summaryCount.active})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'INACTIVE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('INACTIVE')}
          >
            Tạm Dừng ({summaryCount.inactive})
          </button>
          <button
            className={`btn btn-sm ${filterStatus === 'EXPIRED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterStatus('EXPIRED')}
          >
            Đã Hết Hạn ({summaryCount.expired})
          </button>
        </div>
      </div>

      {/* Interactive Visual Voucher Grid */}
      {vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Ticket size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} />
          <p>Không tìm thấy khuyến mãi nào phù hợp.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {vouchers.map((voucher) => (
            <VoucherCard
              key={voucher.id}
              voucher={voucher}
              onEdit={(v) => console.log('Mở form sửa:', v.code)}
              onToggleStatus={(id, currentStatus) => {
                // Logic đảo ngược trạng thái
                const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                toggleVoucherStatus(id, newStatus);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};