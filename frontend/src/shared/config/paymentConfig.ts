/**
 * Cấu hình thông tin tài khoản ngân hàng nhận tiền qua VietQR
 * Quý khách / Chủ nhà hàng có thể thay đổi thông tin tài khoản tại đây.
 */
export interface BankAccountConfig {
  bankId: string;        // Mã ngân hàng theo chuẩn VietQR (vd: MB, VCB, TCB, BIDV, ICB, ACB, VPB, TPB, STB, TIMO...)
  bankName: string;      // Tên hiển thị của ngân hàng
  accountNumber: string; // Số tài khoản ngân hàng
  accountName: string;   // Tên chủ tài khoản (viết hoa không dấu)
  template: 'compact' | 'compact2' | 'qr_only' | 'print';
}

export const PAYMENT_CONFIG: BankAccountConfig = {
  bankId: 'MB',                      // Mặc định: MBBank
  bankName: 'MBBank (Quân Đội)',
  accountNumber: '0368295264',      // Thay bằng số tài khoản của bạn
  accountName: 'NHAN HANG OMNIRESTO', // Thay bằng tên chủ tài khoản của bạn
  template: 'compact2',
};

/**
 * Tạo link ảnh mã VietQR động theo đơn hàng
 * Chuẩn VietQR API: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<ACCOUNT_NAME>
 */
export const generateVietQRUrl = (
  amount: number | string,
  transferContent: string,
  customConfig?: Partial<BankAccountConfig>
): string => {
  const config = { ...PAYMENT_CONFIG, ...customConfig };
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  const encodedContent = encodeURIComponent(transferContent.trim());
  const encodedName = encodeURIComponent(config.accountName.trim());

  return `https://img.vietqr.io/image/${config.bankId}-${config.accountNumber}-${config.template}.png?amount=${safeAmount}&addInfo=${encodedContent}&accountName=${encodedName}`;
};

/**
 * Danh sách mã ngân hàng phổ biến tại Việt Nam hỗ trợ VietQR
 */
export const POPULAR_BANKS = [
  { id: 'MB', name: 'MBBank (Ngân hàng Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { id: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { id: 'BIDV', name: 'BIDV (Đầu tư và Phát triển VN)' },
  { id: 'ICB', name: 'VietinBank (Công Thương Việt Nam)' },
  { id: 'ACB', name: 'ACB (Á Châu)' },
  { id: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { id: 'TPB', name: 'TPBank (Tiên Phong)' },
  { id: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { id: 'HDB', name: 'HDBank (Phát triển TP.HCM)' },
  { id: 'VIB', name: 'VIB (Quốc Tế Việt Nam)' },
  { id: 'MSB', name: 'MSB (Hàng Hải Việt Nam)' },
  { id: 'LPB', name: 'LPBank (Lộc Phát Việt Nam)' },
  { id: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  { id: 'OCB', name: 'OCB (Phương Đông)' },
  { id: 'TIMO', name: 'Timo (Ngân hàng số Bản Việt)' },
];
