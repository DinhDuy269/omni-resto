package com.omniresto.backend.service;

<<<<<<< Updated upstream
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
=======
import com.omniresto.backend.domain.OtpVerificationEntity;
import com.omniresto.backend.domain.enums.OtpPurpose;
import com.omniresto.backend.repository.OtpVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final EmailService emailService;
    private static final SecureRandom random = new SecureRandom();

    // Tạo mã OTP 6 chữ số
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

    // Xác minh mã OTP
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
>>>>>>> Stashed changes
    }
}