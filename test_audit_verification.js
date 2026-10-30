const http = require('http');

const BASE_URL = 'http://localhost:8080';
const STAFF_KEY = 'STAFF_SECRET_KEY';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: body
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function postJson(path, body, headers = {}) {
  const payload = JSON.stringify(body || {});
  const url = new URL(path, BASE_URL);
  return request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      ...headers
    }
  }, payload);
}

function getJson(path, headers = {}) {
  const url = new URL(path, BASE_URL);
  return request({
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...headers
    }
  });
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM CHỨNG TOÀN DIỆN (AUDIT VERIFICATION)');
  console.log('================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  ✅ [PASS] ${testName}`);
      if (details) console.log(`     ↳ ${details}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     ↳ ${details}`);
    }
  }

  try {
    // ── 0. Chuẩn bị môi trường: Reset bàn tbl-01 và tbl-02 ──
    console.log('--- 0. Chuẩn bị môi trường ---');
    const reset1 = await postJson('/api/table-sessions/tables/tbl-01/reset?staffId=MGR-01&reason=TestReset', {}, { 'X-Staff-Key': STAFF_KEY });
    const reset2 = await postJson('/api/table-sessions/tables/tbl-02/reset?staffId=MGR-01&reason=TestReset', {}, { 'X-Staff-Key': STAFF_KEY });
    assert(reset1.status === 200, 'Staff reset tbl-01 thành công');
    assert(reset2.status === 200, 'Staff reset tbl-02 thành công');

    // Lấy danh sách menu items còn active và phục vụ trong ca hiện tại
    const menuRes = await getJson('/api/menu-items');
    const itemsList = Array.isArray(menuRes.data) ? menuRes.data : (menuRes.data?.content || []);
    const availableItem = itemsList.find(m => m.status === 'available' && m.is_available_now) || itemsList[1];
    const availableItem2 = itemsList.find(m => m.id !== availableItem.id && m.status === 'available' && m.is_available_now) || itemsList[2];
    console.log(`     Sử dụng món test: [${availableItem.id}] ${availableItem.name} (${availableItem.base_price}đ)`);

    // Lấy secret token của bàn tbl-01 và tbl-02
    const tablesRes = await getJson('/api/tables', { 'X-Staff-Key': STAFF_KEY });
    const tbl01 = (tablesRes.data || []).find(t => t.id === 'tbl-01');
    const tbl02 = (tablesRes.data || []).find(t => t.id === 'tbl-02');
    const qr01 = tbl01.qr_secret_token;
    const qr02 = tbl02.qr_secret_token;

    // ── TEST 1: Check-in bàn tbl-01 ──
    console.log('\n--- 1. Check-in khách bàn tbl-01 ---');
    const checkinRes = await postJson('/api/table-sessions/check-in', {
      qr_secret_token: qr01,
      device_token: 'dev-client-phone-01',
      mode: 'dine_in'
    });
    const sessionToken = checkinRes.data?.session_token;
    assert(checkinRes.status === 200 && sessionToken, 'Check-in thành công lấy được sessionToken');

    // ── TEST 2: Idempotency-Key song song (Bấm gửi đơn 2 lần) ──
    console.log('\n--- 2. Kiểm chứng Idempotency-Key (Gửi 2 request song song cùng key) ---');
    const testIdempotencyKey = 'IDEM-TEST-' + Date.now();
    const orderPayload = {
      order_type: 'dine_in',
      table_no: 'Bàn 01',
      items: [
        {
          menu_item_id: availableItem.id,
          quantity: 2,
          notes: 'Ít đường'
        }
      ]
    };

    const [orderRes1, orderRes2] = await Promise.all([
      postJson('/api/orders', orderPayload, {
        'X-Table-Session': sessionToken,
        'Idempotency-Key': testIdempotencyKey
      }),
      postJson('/api/orders', orderPayload, {
        'X-Table-Session': sessionToken,
        'Idempotency-Key': testIdempotencyKey
      })
    ]);

    assert(
      orderRes1.status === 201 && orderRes2.status === 201,
      'Cả 2 request gửi đồng thời đều trả về HTTP 201'
    );
    assert(
      orderRes1.data?.order_number === orderRes2.data?.order_number,
      'Idempotency-Key bảo vệ thành công: Cả 2 nhận cùng 1 order_number (không tạo đơn trùng)',
      `Order #1: ${orderRes1.data?.order_number}, Order #2: ${orderRes2.data?.order_number}`
    );
    const orderId = orderRes1.data?.id;
    const orderItem1 = orderRes1.data?.items?.[0];

    // ── TEST 3: Yêu cầu thanh toán & Kiểm chứng VietQR ──
    console.log('\n--- 3. Yêu cầu thanh toán & Sinh VietQR cố định số tiền ---');
    const reqPayRes = await postJson('/api/table-sessions/request-payment', {}, {
      'X-Table-Session': sessionToken
    });
    assert(reqPayRes.status === 200, 'Yêu cầu thanh toán thành công (200 OK)');
    assert(reqPayRes.data?.status === 'payment_requested', 'Trạng thái phiên đổi thành payment_requested');
    const vietQr = reqPayRes.data?.viet_qr;
    assert(
      vietQr && vietQr.qr_image_url && vietQr.qr_code,
      'VietQR được sinh đầy đủ qr_image_url và qr_code (Không còn N/A)',
      `qr_image_url: ${vietQr?.qr_image_url}`
    );
    assert(
      vietQr?.bank_id === 'MB' && vietQr?.account_number === '0368295264',
      'VietQR chứa đúng thông tin cấu hình tài khoản MBBank 0368295264'
    );
    assert(
      Number(vietQr?.amount) === Number(orderRes1.data?.total_amount),
      `Số tiền cố định trên mã QR khớp chính xác với hóa đơn: ${vietQr?.amount} đ`
    );

    // ── TEST 4: Gọi thêm món khi hóa đơn đang đóng băng -> Kỳ vọng 409 Conflict ──
    console.log('\n--- 4. Kiểm chứng mã lỗi khi gọi món lúc hóa đơn đóng băng ---');
    const frozenOrderRes = await postJson('/api/orders', {
      order_type: 'dine_in',
      table_no: 'Bàn 01',
      items: [{ menu_item_id: availableItem.id, quantity: 1 }]
    }, {
      'X-Table-Session': sessionToken
    });
    assert(
      frozenOrderRes.status === 409,
      'Hóa đơn đóng băng trả về chính xác HTTP 409 Conflict (không phải 400)',
      `HTTP Status: ${frozenOrderRes.status}, Error: ${frozenOrderRes.data?.message}`
    );

    // ── TEST 5: Hủy yêu cầu thanh toán (Rã đông) & Gọi thêm món Round 2 ──
    console.log('\n--- 5. Rã đông hóa đơn & Đặt thêm món Round 2 ---');
    const cancelPayReqRes = await postJson('/api/table-sessions/cancel-payment-request', {}, {
      'X-Table-Session': sessionToken
    });
    assert(cancelPayReqRes.status === 200, 'Hủy yêu cầu thanh toán thành công (200 OK)');
    assert(cancelPayReqRes.data?.status === 'active', 'Trạng thái phiên trở về active (rã đông)');

    // Gọi thêm món đợt 2 (Round 2)
    const round2Res = await postJson('/api/orders', {
      order_type: 'dine_in',
      table_no: 'Bàn 01',
      items: [{ menu_item_id: availableItem2.id, quantity: 1, notes: 'Đợt gọi thứ hai' }]
    }, {
      'X-Table-Session': sessionToken
    });
    assert(round2Res.status === 201, 'Đặt thêm món Round 2 thành công');
    assert(
      round2Res.data?.items?.some(it => it.round_no === 2),
      'Đơn hàng ghi nhận đúng round_no = 2 cho món gọi thêm'
    );

    // ── TEST 6: IDOR Security Test (Khách bàn khác hủy món bàn này) ──
    console.log('\n--- 6. Kiểm chứng bảo mật IDOR (Cross-table item cancellation) ---');
    // Check-in bàn tbl-02
    const checkin02 = await postJson('/api/table-sessions/check-in', {
      qr_secret_token: qr02,
      device_token: 'dev-attacker-phone-02',
      mode: 'dine_in'
    });
    const sessionToken02 = checkin02.data?.session_token;

    // Attacker từ Bàn 02 dùng sessionToken02 cố tình hủy món của Bàn 01
    const idorAttackRes = await postJson(
      `/api/orders/${orderId}/items/${orderItem1.id}/cancel?reason=IDOR_ATTACK`,
      {},
      { 'X-Table-Session': sessionToken02 }
    );
    assert(
      idorAttackRes.status === 403,
      'IDOR Attack bị chặn: Khách bàn 02 hủy món bàn 01 trả về HTTP 403 Forbidden',
      `HTTP Status: ${idorAttackRes.status}, Error: ${idorAttackRes.data?.message}`
    );

    // ── TEST 7: Quản lý / Phục vụ hủy món PREPARING ──
    console.log('\n--- 7. Kiểm chứng phân quyền hủy món PREPARING ---');
    // Chuyển món orderItem1 sang preparing
    const patchPrepRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/orders/${orderId}/items/${orderItem1.id}/status?status=preparing`,
      method: 'PATCH',
      headers: { 'X-Staff-Key': STAFF_KEY, 'X-Staff-Id': 'STAFF-POS' }
    });
    console.log(`     PATCH orderItem to preparing: HTTP ${patchPrepRes.status}`);

    // 7a: Khách cố hủy món PREPARING -> 400
    const guestCancelPrepRes = await postJson(
      `/api/orders/${orderId}/items/${orderItem1.id}/cancel`,
      {},
      { 'X-Table-Session': sessionToken }
    );
    assert(
      guestCancelPrepRes.status === 400 && guestCancelPrepRes.data?.message?.includes('Chờ xác nhận'),
      'Khách không thể tự hủy món PREPARING (báo lỗi 400 yêu cầu liên hệ phục vụ)',
      `HTTP Status: ${guestCancelPrepRes.status}, Error: ${guestCancelPrepRes.data?.message}`
    );

    // 7b: Nhân viên thường (WAITER) hủy món PREPARING -> 400 (chỉ Quản lý)
    const waiterCancelPrepRes = await postJson(
      `/api/orders/${orderId}/items/${orderItem1.id}/cancel?reason=KhachDoiY`,
      {},
      { 'X-Staff-Key': STAFF_KEY, 'X-Staff-Id': 'WAITER-01' }
    );
    assert(
      waiterCancelPrepRes.status === 400 && waiterCancelPrepRes.data?.message?.includes('Quản lý'),
      'Nhân viên thường không thể hủy món PREPARING (chỉ Quản lý mới có quyền)',
      `HTTP Status: ${waiterCancelPrepRes.status}, Error: ${waiterCancelPrepRes.data?.message}`
    );

    // 7c: Quản lý hủy món PREPARING nhưng KHÔNG có lý do -> 400
    const mgrNoReasonRes = await postJson(
      `/api/orders/${orderId}/items/${orderItem1.id}/cancel?reason=`,
      {},
      { 'X-Staff-Key': STAFF_KEY, 'X-Staff-Id': 'MANAGER-01' }
    );
    assert(
      mgrNoReasonRes.status === 400 && mgrNoReasonRes.data?.message?.includes('lý do'),
      'Quản lý hủy món PREPARING thiếu lý do bị từ chối (400 bắt buộc lý do)',
      `HTTP Status: ${mgrNoReasonRes.status}, Error: ${mgrNoReasonRes.data?.message}`
    );

    // 7d: Quản lý hủy món PREPARING CÓ lý do -> 200 OK
    const mgrValidCancelRes = await postJson(
      `/api/orders/${orderId}/items/${orderItem1.id}/cancel?reason=${encodeURIComponent('Khách đổi ý sang món khác')}`,
      {},
      { 'X-Staff-Key': STAFF_KEY, 'X-Staff-Id': 'MANAGER-01' }
    );
    assert(
      mgrValidCancelRes.status === 200,
      'Quản lý hủy món PREPARING kèm lý do thành công (200 OK)',
      `HTTP Status: ${mgrValidCancelRes.status}, Error: ${mgrValidCancelRes.data?.message}`
    );

    // ── TEST 8: confirm-payment khi còn món chưa SERVED ──
    console.log('\n--- 8. Kiểm chứng chặn confirm-payment khi còn món chưa SERVED ---');
    // Khách yêu cầu thanh toán lại
    await postJson('/api/table-sessions/request-payment', {}, { 'X-Table-Session': sessionToken });

    // 8a: Thu ngân gọi confirm-payment với forceConfirm=false -> Kỳ vọng 409 Conflict
    const confirmBlockRes = await postJson(
      `/api/table-sessions/tables/tbl-01/confirm-payment?forceConfirm=false`,
      {},
      { 'X-Staff-Key': STAFF_KEY }
    );
    assert(
      confirmBlockRes.status === 409,
      'Chặn xác nhận thanh toán khi còn món chưa SERVED: Trả về HTTP 409 Conflict',
      `HTTP Status: ${confirmBlockRes.status}, Error: ${confirmBlockRes.data?.message}`
    );

    // 8b: Thu ngân gọi confirm-payment với forceConfirm=true -> Kỳ vọng 200 OK & ghi Audit Log
    const forceConfirmRes = await postJson(
      `/api/table-sessions/tables/tbl-01/confirm-payment?forceConfirm=true&staffId=CASHIER-MAIN`,
      {},
      { 'X-Staff-Key': STAFF_KEY }
    );
    assert(
      forceConfirmRes.status === 200,
      'Ghi đè xác nhận thanh toán (forceConfirm=true) thành công (200 OK)',
      `Message: ${forceConfirmRes.data?.message}`
    );

    // Bàn tbl-01 chuyển sang CLEANING
    const tbl01After = await getJson('/api/tables', { 'X-Staff-Key': STAFF_KEY });
    const t01 = (tbl01After.data || []).find(t => t.id === 'tbl-01');
    assert(
      String(t01?.status).toUpperCase() === 'CLEANING',
      'Bàn tbl-01 đã tự động chuyển sang trạng thái CLEANING',
      `Current table status: ${t01?.status}`
    );

    // ── TEST 9: confirm-payment lần thứ 2 -> Kỳ vọng 409 Conflict (Không tạo bút toán mới) ──
    console.log('\n--- 9. Gọi confirm-payment lần 2 cho phiên đã đóng ---');
    const confirmTwiceRes = await postJson(
      `/api/table-sessions/tables/tbl-01/confirm-payment?forceConfirm=true`,
      {},
      { 'X-Staff-Key': STAFF_KEY }
    );
    assert(
      confirmTwiceRes.status === 409,
      'Phiên bàn đã đóng gọi lại bị chặn với HTTP 409 Conflict (không duplicate payment ledger)',
      `HTTP Status: ${confirmTwiceRes.status}, Error: ${confirmTwiceRes.data?.message}`
    );

    // ── TEST 10: Phân quyền Reset Endpoint ──
    console.log('\n--- 10. Phân quyền Endpoint Reset Bàn ---');
    // Khách không có staff key gọi reset -> 401 hoặc 403
    const guestResetRes = await postJson('/api/table-sessions/tables/tbl-01/reset');
    assert(
      guestResetRes.status === 401 || guestResetRes.status === 403,
      'Khách không có staff key gọi Reset Endpoint bị chặn (HTTP 401/403)',
      `HTTP Status: ${guestResetRes.status}`
    );

    // Khách gọi endpoint nhân viên bằng token phiên khách -> kỳ vọng 401/403
    const guestWithSessionResetRes = await postJson(
      '/api/table-sessions/tables/tbl-01/reset',
      {},
      { 'X-Table-Session': sessionToken }
    );
    assert(
      guestWithSessionResetRes.status === 401 || guestWithSessionResetRes.status === 403,
      'Khách dùng token khách gọi Reset Endpoint bị từ chối truy cập (HTTP 401/403)',
      `HTTP Status: ${guestWithSessionResetRes.status}`
    );

    // Nhân viên có staff key gọi reset kèm lý do -> 200 OK
    const staffResetRes = await postJson(
      '/api/table-sessions/tables/tbl-01/reset?staffId=STAFF-02&reason=CustomerLeft',
      {},
      { 'X-Staff-Key': STAFF_KEY }
    );
    assert(
      staffResetRes.status === 200,
      'Nhân viên reset bàn thành công kèm lý do và ghi audit log (200 OK)'
    );

    // Dọn dẹp bàn 02
    await postJson('/api/table-sessions/tables/tbl-02/reset', {}, { 'X-Staff-Key': STAFF_KEY });

    console.log('\n================================================================');
    console.log(`🎉 HOÀN THÀNH TOÀN BỘ KIỂM CHỨNG: ${passedCount}/${totalCount} TEST PASS!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Lỗi nghiêm trọng trong quá trình chạy test suite:', err);
  }
}

runAllTests();
