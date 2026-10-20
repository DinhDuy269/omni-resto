import React, { useState } from 'react';
import { Search, Plus, Ticket, RefreshCw } from 'lucide-react';
import { VoucherCard } from './components/VoucherCard';
import { VoucherFormModal } from './components/VoucherFormModal';
import { useVoucher } from './hooks/useVoucher';
import { useAdminStore } from '../../store/adminStore';
import type { VoucherInfo } from '../../../shared/types';

export const VoucherManagement: React.FC = () => {
  const {
    vouchers,
    summaryCount,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    toggleVoucherStatus,
  } = useVoucher();

  const { addVoucher, updateVoucher, fetchInitialData, isLoading } = useAdminStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherInfo | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateNew = () => {
    setEditingVoucher(null);
    setIsModalOpen(true);
  };

  const handleEdit = (voucher: VoucherInfo) => {
    setEditingVoucher(voucher);
    setIsModalOpen(true);
  };

  const handleSubmitModal = async (data: Partial<VoucherInfo>) => {
    if (editingVoucher) {
      await updateVoucher(editingVoucher.id, data);
      showToast('success', `Đã cập nhật thành công voucher [${data.code}]!`);
    } else {
      await addVoucher(data);
      showToast('success', `Đã tạo mới thành công mã voucher [${data.code}]!`);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await toggleVoucherStatus(id, newStatus);
      showToast('success', `Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} mã voucher!`);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi cập nhật trạng thái voucher!');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 10000,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{notification.type === 'success' ? '✅' : '❌'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Action Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={24} color="var(--primary)" />
            Quản Lý Khuyến Mãi & Voucher
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Thiết lập mã giảm giá, kiểm soát lượt sử dụng và kích cầu doanh số nhà hàng
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

          <button
            className="btn btn-secondary"
            onClick={() => fetchInitialData()}
            title="Làm mới danh sách"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

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
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Form Modal for Creating / Editing */}
      <VoucherFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        initialData={editingVoucher}
      />
    </div>
  );
};

export default VoucherManagement;