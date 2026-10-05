package com.omniresto.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otpCode, String purposeText) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("OmniResto - Mã xác minh OTP (" + purposeText + ")");

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;\">" +
                    "<h2 style=\"color: #e65100; text-align: center;\">OmniResto Restaurant</h2>" +
                    "<hr style=\"border: none; border-top: 1px solid #eee;\"/>" +
                    "<p>Xin chào,</p>" +
                    "<p>Bạn vừa yêu cầu mã xác minh cho mục đích: <strong>" + purposeText + "</strong>.</p>" +
                    "<div style=\"background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;\">" +
                    "<span style=\"font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d84315;\">" + otpCode + "</span>" +
                    "</div>" +
                    "<p style=\"color: #666; font-size: 14px;\">Mã OTP này có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>" +
                    "<br/>" +
                    "<p style=\"color: #999; font-size: 12px; text-align: center;\">Đây là email tự động, vui lòng không phản hồi email này.</p>" +
                    "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Đã gửi email OTP thành công tới: {}", toEmail);
        } catch (MessagingException e) {
            log.error("Lỗi khi gửi email OTP tới: {}", toEmail, e);
            throw new RuntimeException("Không thể gửi email OTP, vui lòng thử lại sau!");
        }
    }
}