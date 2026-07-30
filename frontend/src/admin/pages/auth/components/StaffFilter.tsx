import React from 'react';

interface Props {
  roleFilter: string;
  onSelectRole: (role: string) => void;
}

export const StaffFilter: React.FC<Props> = ({ roleFilter, onSelectRole }) => {
  return (
    <select
      className="form-control"
      value={roleFilter}
      onChange={(e) => onSelectRole(e.target.value)}
      style={{ width: 'auto' }}
    >
      <option value="ALL">Tất cả vai trò</option>
      <option value="store_manager">Quản lý cửa hàng</option>
      <option value="cashier">Thu ngân</option>
      <option value="waiter">Phục vụ</option>
      <option value="chef">Đầu bếp</option>
    </select>
  );
};
