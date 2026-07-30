import React, { useState } from 'react';
import { Store, Plus, Search, MapPin, Phone, UserCheck, Star, Power, Edit3 } from 'lucide-react';
import { useAdminStore } from '../../store/adminStore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../../shared/components/Modal';
import type { BranchStatus } from '../../../shared/types/admin';

export const BranchManagement: React.FC = () => {
  const { branches, addBranch, updateBranchStatus } = useAdminStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    managerName: '',
    tablesCount: 20,
  });

  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    addBranch({
      code: formData.code,
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      managerName: formData.managerName || 'Chưa phân công',
      status: 'ACTIVE',
      tablesCount: Number(formData.tablesCount) || 15,
      rating: 5.0,
    });

    setIsModalOpen(false);
    setFormData({ code: '', name: '', address: '', phone: '', managerName: '', tablesCount: 20 });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Quản Lý Chi Nhánh ({branches.length})
          </h2>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Theo dõi trạng thái, doanh thu và cấu hình vận hành các địa điểm trên toàn chuỗi
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={19} />
          Thêm Chi Nhánh Mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '300px' }}>
          <div className="search-bar" style={{ width: '100%' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên chi nhánh, mã (HN-HK), địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Lọc trạng thái:</span>
          <select
            className="form-select"
            style={{ width: '190px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả ({branches.length})</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="CLOSED">Đóng cửa</option>
          </select>
        </div>
      </div>

      {/* Branch Cards Grid - Spacious */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '28px' }}>
        {filteredBranches.map((branch) => (
          <div
            key={branch.id}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
              borderTop: `4px solid ${
                branch.status === 'ACTIVE' ? 'var(--primary)' : 'var(--warning)'
              }`,
            }}
          >
            <div>
              {/* Header Info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--primary-subtle)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Store size={26} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {branch.name}
                    </strong>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                      MÃ: {branch.code}
                    </div>
                  </div>
                </div>

                <StatusBadge status={branch.status} />
              </div>

              {/* Address & Manager */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-body)', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <MapPin size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{branch.address}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={18} color="var(--text-muted)" />
                  <span>{branch.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCheck size={18} color="var(--text-muted)" />
                  <span>Quản lý chi nhánh: <strong>{branch.managerName}</strong></span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                backgroundColor: 'var(--bg-app)',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', fontWeight: 700 }}>SỐ BÀN</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{branch.tablesCount} bàn</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', fontWeight: 700 }}>ĐƠN LIVE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>{branch.activeOrdersCount} đơn</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted)', fontWeight: 700 }}>ĐÁNH GIÁ</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                  <Star size={15} fill="var(--warning)" /> {branch.rating}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  const nextStatus: BranchStatus = branch.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
                  updateBranchStatus(branch.id, nextStatus);
                }}
              >
                <Power size={16} />
                {branch.status === 'ACTIVE' ? 'Chuyển Bảo Trì' : 'Mở Hoạt Động'}
              </button>
              <button className="btn btn-secondary btn-sm btn-icon">
                <Edit3 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create New Branch */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Chi Nhánh Mới Trên Toàn Chuỗi">
        <form onSubmit={handleSubmitNewBranch}>
          <div className="form-group">
            <label className="form-label">Mã Chi Nhánh (Ví dụ: HN-CG, HCM-Q3)*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: HN-BD"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Chi Nhánh*</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: OmniResto - Ba Đình"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Địa Chỉ Chi Nhánh*</label>
            <input
              type="text"
              className="form-input"
              placeholder="Số nhà, tên đường, Quận/Huyện, Tỉnh/TP"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Số Điện Thoại Hotline</label>
              <input
                type="text"
                className="form-input"
                placeholder="024 3888 xxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số Lượng Bàn Phục Vụ</label>
              <input
                type="number"
                className="form-input"
                min={5}
                max={100}
                value={formData.tablesCount}
                onChange={(e) => setFormData({ ...formData, tablesCount: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tên Quản Lý Chi Nhánh</label>
            <input
              type="text"
              className="form-input"
              placeholder="Tên quản lý trực tiếp"
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '28px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo Chi Nhánh
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
