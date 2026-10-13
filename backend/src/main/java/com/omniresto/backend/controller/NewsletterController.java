package com.omniresto.backend.controller;

import com.omniresto.backend.domain.NewsletterSubscriberEntity;
import com.omniresto.backend.exception.BadRequestException;
import com.omniresto.backend.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/newsletter")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService newsletterService;

    /** POST /api/newsletter/subscribe */
    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestBody Map<String, String> body) {
        String email = body != null ? body.getOrDefault("email", "") : "";
        String name  = body != null ? body.getOrDefault("name", "") : "";
        if (email.isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }
        return newsletterService.subscribe(email, name);
    }

    /** POST /api/newsletter/unsubscribe */
    @PostMapping("/unsubscribe")
    public Map<String, Object> unsubscribe(@RequestBody Map<String, String> body) {
        String email = body != null ? body.getOrDefault("email", "") : "";
        return newsletterService.unsubscribe(email);
    }

    /** GET /api/newsletter/subscribers — admin only */
    @GetMapping("/subscribers")
    public List<NewsletterSubscriberEntity> getSubscribers() {
        return newsletterService.getAllSubscribers();
    }
}
