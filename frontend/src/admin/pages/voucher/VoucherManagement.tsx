import React, { useState } from 'react';
import { Search, Plus, Ticket } from 'lucide-react';
import { VoucherCard } from './components/VoucherCard';
import { useVoucher } from './hooks/useVoucher';
import { voucherApi } from '../../../shared/api/voucherApi';
import { useAdminStore } from '../../store/adminStore';
import { Modal } from '../../../shared/components/Modal';
import type { VoucherInfo, VoucherStatus, DiscountType } from '../../../shared/types/admin';

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

  const { vouchers: allVouchers, setVouchers } = useAdminStore();

  // Modals state giống TableManagement
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherInfo | null>(null);

  // Form State
  const initialForm = {
    code: '',
    name: '',
    description: '',
    discountType: 'FIXED_AMOUNT' as DiscountType,
    discountValue: 0,
    maxDiscountAmount: 0,
    minOrderAmount: 0,
    totalQuantity: 100,
    usageLimitPerUser: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'ACTIVE' as VoucherStatus,
  };

  const [voucherForm, setVoucherForm] = useState(initialForm);

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setVoucherForm(initialForm);
    setIsAddModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (v: VoucherInfo) => {
    setEditingVoucher(v);
    setVoucherForm({
      code: v.code,
      name: v.name,
      description: v.description || '',
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscountAmount: v.maxDiscountAmount || 0,
      minOrderAmount: v.minOrderAmount,
      totalQuantity: v.totalQuantity,
      usageLimitPerUser: v.usageLimitPerUser,
      startDate: v.startDate ? v.startDate.slice(0, 10) : '',
      endDate: v.endDate ? v.endDate.slice(0, 10) : '',
      status: v.status,
    });
  };

  // Xử lý tạo mới voucher
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherForm.code.trim() || !voucherForm.name.trim()) return;

    try {
      const payload: Partial<VoucherInfo> = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        discountValue: Number(voucherForm.discountValue),
        maxDiscountAmount:
          voucherForm.discountType === 'PERCENTAGE' && Number(voucherForm.maxDiscountAmount) > 0
            ? Number(voucherForm.maxDiscountAmount)
            : undefined,
        minOrderAmount: Number(voucherForm.minOrderAmount) || 0,
        totalQuantity: Number(voucherForm.totalQuantity) || 0,
        usageLimitPerUser: Number(voucherForm.usageLimitPerUser) || 1,
      };

      const created = await voucherApi.createVoucher(payload);
      setVouchers([created, ...allVouchers]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo khuyến mãi!');
    }
  };

  // Xử lý lưu chỉnh sửa voucher
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucher || !voucherForm.code.trim()) return;

    try {
      const payload: Partial<VoucherInfo> = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        discountValue: Number(voucherForm.discountValue),
        maxDiscountAmount:
          voucherForm.discountType === 'PERCENTAGE' && Number(voucherForm.maxDiscountAmount) > 0
            ? Number(voucherForm.maxDiscountAmount)
            : undefined,
        minOrderAmount: Number(voucherForm.minOrderAmount) || 0,
        totalQuantity: Number(voucherForm.totalQuantity) || 0,
        usageLimitPerUser: Number(voucherForm.usageLimitPerUser) || 1,
      };

      const updated = await voucherApi.updateVoucher(editingVoucher.id, payload);
      setVouchers(allVouchers.map((v) => (v.id === editingVoucher.id ? updated : v)));
      setEditingVoucher(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật khuyến mãi!');
    }
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

          <button className="btn btn-primary" onClick={handleOpenAddModal}>
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
              onEdit={() => handleOpenEditModal(voucher)}
              onToggleStatus={(id, currentStatus) => {
                const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                toggleVoucherStatus(id, newStatus);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal: Thêm Khuyến Mãi Mới (Giống cấu trúc Modal TableManagement) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Thêm Mã Khuyến Mãi Mới">
        <form onSubmit={handleSubmitAdd}>
          <div className="form-group">
            <label className="form-label">Mã Khuyến Mãi (Code)*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: GIAM20K, CHAOBANMOI..."
              required
              value={voucherForm.code}
              onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Chương Trình Khuyến Mãi*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: Giảm 20.000đ cho đơn từ 100k"
              required
              value={voucherForm.name}
              onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hình Thức Giảm*</label>
              <select
                className="form-select"
                value={voucherForm.discountType}
                onChange={(e) => setVoucherForm({ ...voucherForm, discountType: e.target.value as DiscountType })}
              >
                <option value="FIXED_AMOUNT">Giảm Tiền Mặt (VNĐ)</option>
                <option value="PERCENTAGE">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {voucherForm.discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%)*' : 'Mức Giảm (VNĐ)*'}
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                required
                value={voucherForm.discountValue}
                onChange={(e) => setVoucherForm({ ...voucherForm, discountValue: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Giảm Tối Đa (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                disabled={voucherForm.discountType !== 'PERCENTAGE'}
                placeholder={voucherForm.discountType !== 'PERCENTAGE' ? 'Không áp dụng' : 'VD: 50000'}
                value={voucherForm.maxDiscountAmount}
                onChange={(e) => setVoucherForm({ ...voucherForm, maxDiscountAmount: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Đơn Hàng Tối Thiểu (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={voucherForm.minOrderAmount}
                onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tổng Lượt Dùng (Số lượng)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.totalQuantity}
                onChange={(e) => setVoucherForm({ ...voucherForm, totalQuantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giới Hạn Lượt/Khách*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.usageLimitPerUser}
                onChange={(e) => setVoucherForm({ ...voucherForm, usageLimitPerUser: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ngày Bắt Đầu*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.startDate}
                onChange={(e) => setVoucherForm({ ...voucherForm, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ngày Kết Thúc*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.endDate}
                onChange={(e) => setVoucherForm({ ...voucherForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo Khuyến Mãi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chỉnh Sửa Khuyến Mãi */}
      <Modal isOpen={!!editingVoucher} onClose={() => setEditingVoucher(null)} title="Chỉnh Sửa Thông Tin Voucher">
        <form onSubmit={handleSubmitEdit}>
          <div className="form-group">
            <label className="form-label">Mã Khuyến Mãi (Code)*</label>
            <input
              type="text"
              className="form-input"
              required
              value={voucherForm.code}
              onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Chương Trình Khuyến Mãi*</label>
            <input
              type="text"
              className="form-input"
              required
              value={voucherForm.name}
              onChange={(e) => setVoucherForm({ ...voucherForm, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hình Thức Giảm*</label>
              <select
                className="form-select"
                value={voucherForm.discountType}
                onChange={(e) => setVoucherForm({ ...voucherForm, discountType: e.target.value as DiscountType })}
              >
                <option value="FIXED_AMOUNT">Giảm Tiền Mặt (VNĐ)</option>
                <option value="PERCENTAGE">Giảm Theo Phần Trăm (%)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {voucherForm.discountType === 'PERCENTAGE' ? 'Phần Trăm Giảm (%)*' : 'Mức Giảm (VNĐ)*'}
              </label>
              <input
                type="number"
                className="form-input"
                min={0}
                required
                value={voucherForm.discountValue}
                onChange={(e) => setVoucherForm({ ...voucherForm, discountValue: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Giảm Tối Đa (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                disabled={voucherForm.discountType !== 'PERCENTAGE'}
                value={voucherForm.maxDiscountAmount}
                onChange={(e) => setVoucherForm({ ...voucherForm, maxDiscountAmount: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Đơn Hàng Tối Thiểu (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={voucherForm.minOrderAmount}
                onChange={(e) => setVoucherForm({ ...voucherForm, minOrderAmount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Tổng Lượt Dùng (Số lượng)*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.totalQuantity}
                onChange={(e) => setVoucherForm({ ...voucherForm, totalQuantity: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giới Hạn Lượt/Khách*</label>
              <input
                type="number"
                className="form-input"
                min={1}
                required
                value={voucherForm.usageLimitPerUser}
                onChange={(e) => setVoucherForm({ ...voucherForm, usageLimitPerUser: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Ngày Bắt Đầu*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.startDate}
                onChange={(e) => setVoucherForm({ ...voucherForm, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ngày Kết Thúc*</label>
              <input
                type="date"
                className="form-input"
                required
                value={voucherForm.endDate}
                onChange={(e) => setVoucherForm({ ...voucherForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setEditingVoucher(null)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VoucherManagement;