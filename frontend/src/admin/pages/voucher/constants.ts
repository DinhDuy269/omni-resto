// constants.ts (Kế thừa cách làm của TABLE_STATUS_FILTERS)

export const VOUCHER_STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất Cả Voucher' },
  { id: 'ACTIVE', label: 'Đang Hoạt Động' },
  { id: 'INACTIVE', label: 'Tạm Dừng' },
  { id: 'EXPIRED', label: 'Đã Hết Hạn' },
];

export const DISCOUNT_TYPE_OPTIONS = [
  { id: 'FIXED_AMOUNT', label: 'Giảm Tiền Mặt (VNĐ)' },
  { id: 'PERCENTAGE', label: 'Giảm Theo Phần Trăm (%)' },
];