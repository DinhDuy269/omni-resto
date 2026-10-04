package com.omniresto.backend.service;

import com.omniresto.backend.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    // Lưu trữ tạm OTP trong bộ nhớ RAM: Key = Phone, Value = OtpData
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();

    private static final long OTP_VALID_DURATION = 5 * 60 * 1000; // 5 phút (milli-seconds)

    private static class OtpData {
        String code;
        long expiryTime;

        OtpData(String code, long expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    public String generateOtp(String phone) {
        String otp = String.format("%06d", new Random().nextInt(900000) + 100000);
        long expiryTime = System.currentTimeMillis() + OTP_VALID_DURATION;
        otpStorage.put(phone, new OtpData(otp, expiryTime));

        // Mô phỏng gửi SMS / Console log (Thực tế sẽ gọi Brandname SMS Gateway)
        System.out.println("====== [OMNI RESTO OTP SYSTEM] ======");
        System.out.println("Gửi OTP tới SĐT: " + phone);
        System.out.println("Mã OTP của bạn là: " + otp);
        System.out.println("======================================");

        return otp;
    }

    public boolean validateOtp(String phone, String inputOtp) {
        OtpData otpData = otpStorage.get(phone);

        if (otpData == null) {
            throw new BadRequestException("Mã OTP chưa được gửi hoặc đã hết hạn!");
        }

        if (System.currentTimeMillis() > otpData.expiryTime) {
            otpStorage.remove(phone);
            throw new BadRequestException("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới!");
        }

        if (!otpData.code.equals(inputOtp)) {
            throw new BadRequestException("Mã OTP không chính xác!");
        }

        // Xóa OTP sau khi đã xác minh thành công
        otpStorage.remove(phone);
        return true;
    }
}