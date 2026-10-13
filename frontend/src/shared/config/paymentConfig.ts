/**
 * Cấu hình thông tin tài khoản ngân hàng nhận tiền qua VietQR
 * Quý khách / Chủ nhà hàng có thể thay đổi thông tin tài khoản tại đây.
 */
export interface BankAccountConfig {
<<<<<<< HEAD
  bank_id: string;        // Mã ngân hàng theo chuẩn VietQR (vd: MB, VCB, TCB, BIDV, ICB, ACB, VPB, TPB, STB, TIMO...)
  bank_name: string;      // Tên hiển thị của ngân hàng
  account_number: string; // Số tài khoản ngân hàng
  account_name: string;   // Tên chủ tài khoản (viết hoa không dấu)
=======
  bank_id?: string;
  bankId?: string;
  bank_name?: string;
  bankName?: string;
  account_number?: string;
  accountNumber?: string;
  account_name?: string;
  accountName?: string;
>>>>>>> main
  template: 'compact' | 'compact2' | 'qr_only' | 'print';
}

export const PAYMENT_CONFIG: BankAccountConfig = {
<<<<<<< HEAD
  bank_id: 'MB',                      // Mặc định: MBBank
  bank_name: 'MBBank (Quân Đội)',
  account_number: '0368295264',      // Thay bằng số tài khoản của bạn
  account_name: 'NHAN HANG OMNIRESTO', // Thay bằng tên chủ tài khoản của bạn
=======
  bank_id: 'MB',
  bankId: 'MB',
  bank_name: 'MBBank (Quân Đội)',
  bankName: 'MBBank (Quân Đội)',
  account_number: '0368295264',
  accountNumber: '0368295264',
  account_name: 'NHAN HANG OMNIRESTO',
  accountName: 'NHAN HANG OMNIRESTO',
>>>>>>> main
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
<<<<<<< HEAD
  const encodedName = encodeURIComponent(config.account_name.trim());

  return `https://img.vietqr.io/image/${config.bank_id}-${config.account_number}-${config.template}.png?amount=${safeAmount}&addInfo=${encodedContent}&accountName=${encodedName}`;
=======
  const effectiveName = config.accountName || config.account_name || '';
  const effectiveBankId = config.bankId || config.bank_id || 'MB';
  const effectiveAccountNo = config.accountNumber || config.account_number || '';
  const encodedName = encodeURIComponent(effectiveName.trim());

  return `https://img.vietqr.io/image/${effectiveBankId}-${effectiveAccountNo}-${config.template}.png?amount=${safeAmount}&addInfo=${encodedContent}&accountName=${encodedName}`;
>>>>>>> main
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
