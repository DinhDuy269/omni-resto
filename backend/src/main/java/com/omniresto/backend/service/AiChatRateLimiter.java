package com.omniresto.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AiChatRateLimiter {

    @Value("${ai.chat.rate-limit.max-per-minute:15}")
    private int maxRequestsPerMinute;

    private final Map<String, Deque<Long>> requestHistory = new ConcurrentHashMap<>();

    public synchronized boolean tryAcquire(String sessionKey) {
        if (sessionKey == null || sessionKey.trim().isEmpty()) {
            return false;
        }

        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1 minute window

        Deque<Long> timestamps = requestHistory.computeIfAbsent(sessionKey, k -> new ArrayDeque<>());

        // Evict expired timestamps
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxRequestsPerMinute) {
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    public synchronized void reset(String sessionKey) {
        if (sessionKey != null) {
            requestHistory.remove(sessionKey);
        }
    }

    public int getMaxRequestsPerMinute() {
        return maxRequestsPerMinute;
    }

    public void setMaxRequestsPerMinute(int maxRequestsPerMinute) {
        this.maxRequestsPerMinute = maxRequestsPerMinute;
    }
}
