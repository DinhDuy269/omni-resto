package com.omniresto.backend.service;

import com.omniresto.backend.domain.NewsletterSubscriberEntity;
import com.omniresto.backend.repository.NewsletterSubscriberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterSubscriberRepository subscriberRepository;

    /**
     * Subscribe an email. Returns existing if already subscribed.
     */
    @Transactional
    public Map<String, Object> subscribe(String email, String name) {
        email = email.trim().toLowerCase();
        boolean exists = subscriberRepository.existsByEmail(email);
        if (exists) {
            return Map.of("subscribed", false, "message", "Email này đã đăng ký nhận tin trước đó.");
        }
        NewsletterSubscriberEntity entity = NewsletterSubscriberEntity.builder()
                .email(email)
                .name(name)
                .isActive(true)
                .source("website")
                .build();
        subscriberRepository.save(entity);
        return Map.of("subscribed", true, "message", "Đăng ký nhận tin thành công! Cảm ơn bạn đã quan tâm.");
    }

    /**
     * Unsubscribe an email.
     */
    @Transactional
    public Map<String, Object> unsubscribe(String email) {
        return subscriberRepository.findByEmail(email.trim().toLowerCase())
                .map(sub -> {
                    sub.setIsActive(false);
                    subscriberRepository.save(sub);
                    return Map.<String, Object>of("success", true, "message", "Bạn đã hủy đăng ký nhận tin.");
                })
                .orElse(Map.of("success", false, "message", "Email không tìm thấy trong danh sách."));
    }

    /**
     * Get all active subscribers (admin).
     */
    public List<NewsletterSubscriberEntity> getAllSubscribers() {
        return subscriberRepository.findAll().stream()
                .filter(NewsletterSubscriberEntity::getIsActive)
                .toList();
    }
}
