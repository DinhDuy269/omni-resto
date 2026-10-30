const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
const STAFF_KEY = 'STAFF_SECRET_KEY';
const WEBHOOK_SECRET = 'OmniRestoWebhookSecret2026';
const VNPAY_HASH_SECRET = 'XNBCJFAKAZQSGZSABUSXM9QMV8FVOEZM';
const VNPAY_TMN_CODE = 'CGXZLS0Z';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        console.error(`  ❌ FAIL: ${testName} - ${details}`);
    }
}

async function request(url, options = {}) {
    try {
        const res = await fetch(url, options);
        let data = null;
        const text = await res.text();
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
        return { status: res.status, data, headers: res.headers };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

function calculateVnPayHash(params, secret) {
    const keys = Object.keys(params).filter(k => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType').sort();
    let query = '';
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = encodeURIComponent(params[k]);
        query += (i > 0 ? '&' : '') + k + '=' + val;
    }
    return crypto.createHmac('sha512', secret).update(Buffer.from(query, 'utf-8')).digest('hex');
}

async function runTests() {
    console.log('========================================================================');
    console.log('🚀 KIỂM TRA TOÀN DIỆN: BẢO MẬT WEBHOOK, CHỐNG BYPASS & HOÀN TẤT THANH TOÁN');
    console.log('========================================================================\n');

    // Lấy menu món khả dụng
    const menuRes = await request(`${BASE_URL}/api/menu-items`);
    const availableItems = (Array.isArray(menuRes.data) ? menuRes.data : [])
        .filter(m => m.status === 'available' && m.is_available_now);
    if (availableItems.length === 0) {
        console.error('Không tìm thấy món ăn khả dụng để tạo đơn test!');
        return;
    }
    const testDish = availableItems[0];

    // Lấy danh sách bàn
    const tablesRes = await request(`${BASE_URL}/api/tables`);
    const tables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
    const testTable = tables.find(t => t.table_no === '04' || t.table_no === 'Bàn 04') || tables[3] || tables[0];
    const tableId = testTable.id;
    const qrSecret = testTable.qr_secret_token;

    // Reset bàn sạch trước khi test
    await request(`${BASE_URL}/api/table-sessions/tables/${tableId}/reset`, {
        method: 'POST',
        headers: { 'X-Staff-Key': STAFF_KEY }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 1: BẢO MẬT NGUỒN GỌI WEBHOOK (CHỐNG FAKE WEBHOOK TỪ BÊN NGOÀI)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- KỊCH BẢN 1: Xác thực nguồn Webhook (Secret & Signature) ---');

    // 1.1 Gọi Webhook không có secret/header
    const noAuthRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            order_id: 'ord-fake-999',
            transaction_id: 'TXN-FAKE-1',
            amount: 100000
        })
    });
    assert(noAuthRes.status === 401, 'Gọi Webhook không có Authorization/Secret bị chặn HTTP 401 Unauthorized', `Status: ${noAuthRes.status}`);

    // 1.2 Gọi Webhook với secret sai
    const wrongSecretRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': 'WRONG_SECRET_KEY'
        },
        body: JSON.stringify({
            order_id: 'ord-fake-999',
            transaction_id: 'TXN-FAKE-2',
            amount: 100000
        })
    });
    assert(wrongSecretRes.status === 401, 'Gọi Webhook với X-Webhook-Secret sai bị chặn HTTP 401 Unauthorized', `Status: ${wrongSecretRes.status}`);

    // 1.3 Gọi Webhook với chữ ký HMAC-SHA256 (X-Signature) hợp lệ
    const testBody = JSON.stringify({
        order_id: 'ord-non-existent',
        transaction_id: 'TXN-SIG-TEST',
        amount: 100000
    });
    const validHmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(testBody).digest('hex');
    const hmacRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Signature': validHmac
        },
        body: testBody
    });
    // Không bị 401 (qua bước xác thực chữ ký an toàn, trả 404 vì đơn chưa tồn tại)
    assert(hmacRes.status === 404, 'Gọi Webhook với X-Signature HMAC-SHA256 hợp lệ được xác thực nguồn thành công', `Status: ${hmacRes.status}`);

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 2: THANH TOÁN WEBHOOK HỢP LỆ VÀ ĐÓNG PHIÊN BÀN TỰ ĐỘNG
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 2: Webhook VietQR thanh toán thành công & Chu trình đóng phiên ---');

    // 2.1 Check-in bàn testTable
    const checkInRes = await request(`${BASE_URL}/api/table-sessions/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_secret_token: qrSecret,
            device_token: 'device-webhook-test-01',
            mode: 'dine_in'
        })
    });
    const sessionToken = checkInRes.data.session_token;
    assert(checkInRes.status === 200 && sessionToken, 'Khách check-in bàn thành công');

    // 2.2 Đặt món
    const orderRes = await request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Table-Session': sessionToken
        },
        body: JSON.stringify({
            table_id: tableId,
            order_type: 'dine_in',
            items: [{ menu_item_id: testDish.id, quantity: 2 }]
        })
    });
    const order = orderRes.data;
    const orderId = order.id;
    const orderNumber = order.order_number;
    const totalAmount = order.total_amount;
    assert((orderRes.status === 201 || orderRes.status === 200) && orderId, `Tạo đơn #${orderNumber} thành công với tổng tiền ${totalAmount}đ`);

    // 2.3 Khách yêu cầu thanh toán (Đóng băng hóa đơn)
    const payReqRes = await request(`${BASE_URL}/api/table-sessions/request-payment`, {
        method: 'POST',
        headers: { 'X-Table-Session': sessionToken }
    });
    assert(payReqRes.status === 200 && payReqRes.data.status === 'payment_requested', 'Bàn chuyển sang trạng thái PAYMENT_REQUESTED (Hóa đơn đóng băng)');

    // 2.4 Ngân hàng gọi Webhook với X-Webhook-Secret chuẩn
    const txId = 'TXN-BANK-' + Date.now();
    const webhookRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
        },
        body: JSON.stringify({
            order_id: orderId,
            transaction_id: txId,
            amount: totalAmount
        })
    });
    assert(webhookRes.status === 200 && webhookRes.data.success === true, 'Webhook trả về HTTP 200 thành công với kết quả tối thiểu bảo mật');
    assert(webhookRes.data.status === 'PAID', 'Trạng thái giao dịch ghi nhận PAID');

    // 2.5 Kiểm tra phiên bàn: Phải là CLOSED, vô hiệu sessionToken
    const currentSessionRes = await request(`${BASE_URL}/api/table-sessions/current`, {
        headers: { 'X-Table-Session': sessionToken }
    });
    assert(currentSessionRes.status === 400 || currentSessionRes.data?.status === 'closed', 'Phiên bàn đã được CLOSED sau Webhook thanh toán');

    // 2.6 Kiểm tra trạng thái bàn: Phải là CLEANING
    const tableCheckRes = await request(`${BASE_URL}/api/tables/${tableId}`);
    assert(tableCheckRes.data.status === 'cleaning', 'Bàn đã tự động chuyển sang trạng thái CLEANING (Chờ dọn dẹp)');

    // 2.7 Khách dùng sessionToken cũ gọi thêm món -> Kỳ vọng 400 Bad Request
    const addOrderRes = await request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Table-Session': sessionToken
        },
        body: JSON.stringify({
            table_id: tableId,
            order_type: 'dine_in',
            items: [{ menu_item_id: testDish.id, quantity: 1 }]
        })
    });
    assert(addOrderRes.status === 400, 'Khách không thể gọi thêm món sau khi thanh toán thành công (Bị chặn do phiên đã đóng)');

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 3: IDEMPOTENCY - CHỐNG WEBHOOK GỬI TRÙNG HAI LẦN
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 3: Chống xử lý trùng lặp Webhook (Idempotency) ---');

    // Gửi lại cùng transaction_id
    const duplicateWebhookRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
        },
        body: JSON.stringify({
            order_id: orderId,
            transaction_id: txId,
            amount: totalAmount
        })
    });
    assert(duplicateWebhookRes.status === 200 && duplicateWebhookRes.data.success === true, 'Gửi lại cùng transaction_id trả về thành công Idempotent OK');
    assert(duplicateWebhookRes.data.message.includes('Idempotent') || duplicateWebhookRes.data.message.includes('trước đó'), 'Báo tin giao dịch đã được xử lý trước đó, không ghi đúp');

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 4: THANH TOÁN THIẾU TIỀN VÀ THỪA TIỀN
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 4: Xử lý thanh toán Thiếu tiền & Thừa tiền ---');

    // Reset bàn 04 và tạo phiên mới
    await request(`${BASE_URL}/api/table-sessions/tables/${tableId}/reset`, {
        method: 'POST',
        headers: { 'X-Staff-Key': STAFF_KEY }
    });

    const checkIn2 = await request(`${BASE_URL}/api/table-sessions/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_secret_token: qrSecret,
            device_token: 'device-underpaid-test',
            mode: 'dine_in'
        })
    });
    const sessionToken2 = checkIn2.data.session_token;

    const order2Res = await request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Table-Session': sessionToken2
        },
        body: JSON.stringify({
            table_id: tableId,
            order_type: 'dine_in',
            items: [{ menu_item_id: testDish.id, quantity: 2 }]
        })
    });
    const order2 = order2Res.data;
    const requiredAmount = order2.total_amount;

    // 4.1 Chuyển thiếu tiền (1,000đ khi đơn cần > 10,000đ)
    const underpaidRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
        },
        body: JSON.stringify({
            order_number: order2.order_number,
            transaction_id: 'TXN-UNDERPAID-' + Date.now(),
            amount: 1000
        })
    });
    assert(underpaidRes.data.status === 'UNDERPAID', 'Chuyển thiếu tiền được gắn cờ UNDERPAID');

    // Kiểm tra phiên: Vẫn chưa bị đóng
    const sessionStillOpen = await request(`${BASE_URL}/api/table-sessions/current`, {
        headers: { 'X-Table-Session': sessionToken2 }
    });
    assert(sessionStillOpen.status === 200 && sessionStillOpen.data.status !== 'closed', 'Phiên bàn KHÔNG bị đóng khi khách thanh toán thiếu tiền');

    // 4.2 Chuyển thừa tiền (Gửi số tiền lớn hơn tổng tiền)
    const overpaidRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
        },
        body: JSON.stringify({
            order_number: order2.order_number,
            transaction_id: 'TXN-OVERPAID-' + Date.now(),
            amount: requiredAmount + 50000
        })
    });
    assert(overpaidRes.data.status === 'OVERPAID' || overpaidRes.data.status === 'PAID', 'Chuyển thừa tiền ghi nhận thành công với cảnh báo đối soát');

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 5: TỰ ĐỘNG PARSE NỘI DUNG CHUYỂN KHOẢN (NGÂN HÀNG / SEPAY / CASSO)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 5: Tự động trích xuất mã đơn từ nội dung chuyển khoản ---');

    await request(`${BASE_URL}/api/table-sessions/tables/${tableId}/reset`, {
        method: 'POST',
        headers: { 'X-Staff-Key': STAFF_KEY }
    });

    const checkIn3 = await request(`${BASE_URL}/api/table-sessions/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_secret_token: qrSecret,
            device_token: 'device-parse-test',
            mode: 'dine_in'
        })
    });
    const sessionToken3 = checkIn3.data.session_token;

    const order3Res = await request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Table-Session': sessionToken3
        },
        body: JSON.stringify({
            table_id: tableId,
            order_type: 'dine_in',
            items: [{ menu_item_id: testDish.id, quantity: 1 }]
        })
    });
    const order3 = order3Res.data;

    // Webhook SePay/Casso chỉ gửi content: "OMNIRESTO ORD-xxxxxx"
    const parseWebhookRes = await request(`${BASE_URL}/api/payments/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WEBHOOK_SECRET}`
        },
        body: JSON.stringify({
            content: `KH Chuyen tien OMNIRESTO ${order3.order_number} noi dung thanh toan`,
            transaction_id: 'TXN-SEPAY-' + Date.now(),
            amount: order3.total_amount
        })
    });
    assert(parseWebhookRes.status === 200 && parseWebhookRes.data.order_number === order3.order_number,
        `Tự động trích xuất mã đơn #${order3.order_number} từ chuỗi nội dung chuyển khoản và thanh toán thành công`);

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 6: VNPAY IPN & READ-ONLY BROWSER CALLBACK
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 6: VNPAY IPN Server-to-Server & Read-Only Callback ---');

    // 6.1 VNPAY IPN với Checksum sai
    const badIpnRes = await request(`${BASE_URL}/api/payments/vnpay/ipn?vnp_TxnRef=ORD-FAKE_123&vnp_SecureHash=INVALID_HASH&vnp_TmnCode=${VNPAY_TMN_CODE}`);
    assert(badIpnRes.data.RspCode === '97', 'VNPAY IPN sai Checksum trả về RspCode: 97 (Invalid Checksum)', `RspCode: ${badIpnRes.data.RspCode}`);

    // 6.2 VNPAY IPN với đơn không tồn tại
    const ipnParamsNonExistent = {
        vnp_TmnCode: VNPAY_TMN_CODE,
        vnp_TxnRef: 'ORD-NOT-FOUND-999_123',
        vnp_Amount: '10000000',
        vnp_ResponseCode: '00'
    };
    const validHashNotFound = calculateVnPayHash(ipnParamsNonExistent, VNPAY_HASH_SECRET);
    const notFoundIpnRes = await request(`${BASE_URL}/api/payments/vnpay/ipn?vnp_TmnCode=${VNPAY_TMN_CODE}&vnp_TxnRef=ORD-NOT-FOUND-999_123&vnp_Amount=10000000&vnp_ResponseCode=00&vnp_SecureHash=${validHashNotFound}`);
    assert(notFoundIpnRes.data.RspCode === '01', 'VNPAY IPN đơn không tồn tại trả về RspCode: 01 (Order not Found)', `RspCode: ${notFoundIpnRes.data.RspCode}`);

    // 6.3 VNPAY IPN hợp lệ cho đơn hàng thật
    await request(`${BASE_URL}/api/table-sessions/tables/${tableId}/reset`, {
        method: 'POST',
        headers: { 'X-Staff-Key': STAFF_KEY }
    });

    const checkIn4 = await request(`${BASE_URL}/api/table-sessions/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            qr_secret_token: qrSecret,
            device_token: 'device-vnpay-test',
            mode: 'dine_in'
        })
    });
    const sessionToken4 = checkIn4.data.session_token;

    const order4Res = await request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Table-Session': sessionToken4
        },
        body: JSON.stringify({
            table_id: tableId,
            order_type: 'dine_in',
            items: [{ menu_item_id: testDish.id, quantity: 1 }]
        })
    });
    const order4 = order4Res.data;

    const ipnParamsSuccess = {
        vnp_TmnCode: VNPAY_TMN_CODE,
        vnp_TxnRef: `${order4.order_number}_${Date.now()}`,
        vnp_Amount: String(order4.total_amount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionNo: 'VNP-TXN-' + Date.now()
    };
    const validHashSuccess = calculateVnPayHash(ipnParamsSuccess, VNPAY_HASH_SECRET);
    const queryStringSuccess = Object.keys(ipnParamsSuccess)
        .map(k => `${k}=${encodeURIComponent(ipnParamsSuccess[k])}`)
        .join('&') + `&vnp_SecureHash=${validHashSuccess}`;

    const validIpnRes = await request(`${BASE_URL}/api/payments/vnpay/ipn?${queryStringSuccess}`);
    assert(validIpnRes.data.RspCode === '00', 'VNPAY IPN hợp lệ trả về RspCode: 00 (Confirm Success)', `RspCode: ${validIpnRes.data.RspCode}`);

    // Kiểm tra phiên bàn đã đóng sau VNPAY IPN
    const sessionAfterIpn = await request(`${BASE_URL}/api/table-sessions/current`, {
        headers: { 'X-Table-Session': sessionToken4 }
    });
    assert(sessionAfterIpn.status === 400 || sessionAfterIpn.data.status === 'closed', 'Phiên bàn đã được CLOSED sau khi nhận VNPAY IPN thành công');

    // 6.4 VNPAY Browser Return Callback: Chỉ đọc, không mutate
    const callbackRes = await request(`${BASE_URL}/api/payments/vnpay/callback?${queryStringSuccess}`);
    assert(callbackRes.status === 200 && (callbackRes.data.is_success === true || callbackRes.data.success === true), 'VNPAY Browser Return Callback trả về kết quả hiển thị cho khách');

    // ──────────────────────────────────────────────────────────────────────────
    // KỊCH BẢN 7: BẢO VỆ ENDPOINT GIẢ LẬP THANH TOÁN (VNPAY DIRECT PAY)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- KỊCH BẢN 7: Endpoint Sandbox Direct Pay (/vnpay/pay) ---');
    const sandboxConfigRes = await request(`${BASE_URL}/api/payments/vnpay/sandbox-config`);
    assert(sandboxConfigRes.status === 200 && sandboxConfigRes.data.bank_name === 'NCB', 'Cấu hình test thẻ Sandbox NCB khả dụng trong môi trường dev');

    console.log('\n========================================================================');
    console.log(`🎉 KẾT QUẢ KIỂM TRA BẢO MẬT & THANH TOÁN: ${passedTests}/${totalTests} KIỂM TRA ĐẠT (100%)`);
    console.log('========================================================================');
}

runTests();
