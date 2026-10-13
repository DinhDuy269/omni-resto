import type { VnPayPaymentInfo, VnPayCallbackResult, VnPayProcessPaymentRequest } from '../types/client';

/**
 * Khởi tạo phiên thanh toán VNPAY-QR Sandbox từ Backend
 */
export async function createVnPayPayment(orderId: string): Promise<VnPayPaymentInfo> {
  const res = await fetch(`/api/payments/vnpay/create/${encodeURIComponent(orderId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Không thể tạo mã thanh toán VNPAY Sandbox!');
  }
  return res.json();
}

/**
 * Thanh toán VNPAY Sandbox trực tiếp với thông tin thẻ test & OTP set sẵn
 */
export async function processVnPayDirectPayment(payload: VnPayProcessPaymentRequest): Promise<VnPayCallbackResult> {
  const res = await fetch('/api/payments/vnpay/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Xác nhận thanh toán VNPAY thất bại!');
  }
  return res.json();
}

/**
 * Xác thực kết quả giao dịch VNPAY trả về từ Backend
 */
export async function verifyVnPayCallback(queryParams: Record<string, string>): Promise<VnPayCallbackResult> {
  const searchParams = new URLSearchParams(queryParams);
  const res = await fetch(`/api/payments/vnpay/callback?${searchParams.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Xác thực thanh toán VNPAY thất bại!');
  }
  return res.json();
}

/**
 * Kiểm tra trạng thái thanh toán của đơn hàng (Polling)
 */
export async function checkPaymentStatus(orderId: string): Promise<{ is_paid: boolean; order_status: string; total_amount?: number }> {
  const res = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`);
  if (!res.ok) {
    return { is_paid: false, order_status: 'pending' };
  }
  const data = await res.json();
  return {
    is_paid: Boolean(data.isPaid ?? data.is_paid),
    order_status: data.orderStatus ?? data.order_status ?? 'pending',
    total_amount: data.totalAmount ?? data.total_amount,
  };
}
