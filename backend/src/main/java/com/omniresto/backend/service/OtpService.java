package com.omniresto.backend.service;

import com.omniresto.backend.domain.OtpVerificationEntity;
import com.omniresto.backend.domain.enums.OtpPurpose;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.repository.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final EmailService emailService;
    private static final SecureRandom random = new SecureRandom();

    // ─────────────────────────────────────────────────────────────
    // 1. LUỒNG XÁC THỰC QUA SỐ ĐIỆN THOẠI (Dùng bộ nhớ RAM tạm)
    // Phục vụ cho CustomerAuthService (Khách hàng vãng lai / Hội viên)
    // ─────────────────────────────────────────────────────────────
    private final Map<String, OtpData> otpStorage = new ConcurrentHashMap<>();
    private static final long OTP_VALID_DURATION = 5 * 60 * 1000; // 5 phút

    private static class OtpData {
        String code;
        long expiryTime;

        OtpData(String code, long expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    public String generateOtp(String phone) {
        String otp = String.format("%06d", random.nextInt(900000) + 100000);
        long expiryTime = System.currentTimeMillis() + OTP_VALID_DURATION;
        otpStorage.put(phone, new OtpData(otp, expiryTime));

        // Mô phỏng log gửi SMS console
        log.info("====== [OMNI RESTO OTP SMS] ======");
        log.info("Gửi OTP tới SĐT: {}", phone);
        log.info("Mã OTP của bạn là: {}", otp);
        log.info("===================================");

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

        otpStorage.remove(phone);
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. LUỒNG XÁC THỰC QUA EMAIL (Lưu Database & Gửi JavaMailSender)
    // Phục vụ cho AuthService (Tài khoản người dùng / Đăng ký / Quên MK)
    // ─────────────────────────────────────────────────────────────

    // Tạo mã OTP 6 chữ số ngẫu nhiên
    public String generateOtpCode() {
        int number = random.nextInt(900000) + 100000;
        return String.valueOf(number);
    }

    // Tạo và gửi mã OTP qua Email
    @Transactional
    public void generateAndSendOtp(String email, OtpPurpose purpose) {
        String otpCode = generateOtpCode();
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(5);

        OtpVerificationEntity otpEntity = OtpVerificationEntity.builder()
                .email(email)
                .otpCode(otpCode)
                .purpose(purpose)
                .expiredAt(expiredAt)
                .isUsed(false)
                .build();

        otpVerificationRepository.save(otpEntity);

        String purposeText = purpose == OtpPurpose.REGISTER_VERIFICATION
                ? "Xác minh đăng ký tài khoản"
                : "Đặt lại mật khẩu";

        emailService.sendOtpEmail(email, otpCode, purposeText);
    }

    // Xác minh mã OTP Email từ Database
    @Transactional
    public boolean verifyOtp(String email, String otpCode, OtpPurpose purpose) {
        var otpOpt = otpVerificationRepository
                .findFirstByEmailAndOtpCodeAndPurposeAndIsUsedFalseAndExpiredAtAfter(
                        email, otpCode, purpose, LocalDateTime.now()
                );

        if (otpOpt.isPresent()) {
            OtpVerificationEntity otpEntity = otpOpt.get();
            otpEntity.setIsUsed(true);
            otpVerificationRepository.save(otpEntity);
            return true;
        }

        return false;
    }
}