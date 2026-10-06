package com.omniresto.backend.controller;

import com.omniresto.backend.domain.NewsletterSubscriberEntity;
import com.omniresto.backend.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Map<String, Object>> subscribe(
            @RequestBody Map<String, String> body
    ) {
        String email = body.getOrDefault("email", "");
        String name  = body.getOrDefault("name", "");
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email không được để trống"));
        }
        return ResponseEntity.ok(newsletterService.subscribe(email, name));
    }

    /** POST /api/newsletter/unsubscribe */
    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, Object>> unsubscribe(
            @RequestBody Map<String, String> body
    ) {
        String email = body.getOrDefault("email", "");
        return ResponseEntity.ok(newsletterService.unsubscribe(email));
    }

    /** GET /api/newsletter/subscribers — admin only */
    @GetMapping("/subscribers")
    public ResponseEntity<List<NewsletterSubscriberEntity>> getSubscribers() {
        return ResponseEntity.ok(newsletterService.getAllSubscribers());
    }
}
