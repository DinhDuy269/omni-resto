package com.omniresto.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class AiChatRateLimiter {

    @Value("${ai.chat.rate-limit.max-per-minute:15}")
    private int maxRequestsPerMinute;

    @Value("${ai.chat.rate-limit.global-max-per-minute:120}")
    private int globalMaxRequestsPerMinute;

    private final Map<String, Deque<Long>> requestHistory = new ConcurrentHashMap<>();
    private final Deque<Long> globalRequestHistory = new ArrayDeque<>();
    private final Object globalLock = new Object();

    public boolean tryAcquire(String sessionKey) {
        if (sessionKey == null || sessionKey.trim().isEmpty()) {
            return false;
        }

        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L; // 1 minute sliding window

        // 1. Check Global Rate Limit (protects Gemini API quota from exhaustion)
        synchronized (globalLock) {
            while (!globalRequestHistory.isEmpty() && globalRequestHistory.peekFirst() < windowStart) {
                globalRequestHistory.pollFirst();
            }
            if (globalRequestHistory.size() >= globalMaxRequestsPerMinute) {
                log.warn("🚨 Global AI chat rate limit reached ({} req/min). Blocking incoming request.", globalMaxRequestsPerMinute);
                return false;
            }
            globalRequestHistory.addLast(now);
        }

        // 2. Check Session Rate Limit (lock per session key only via compute, not whole class)
        final boolean[] allowed = new boolean[]{false};
        requestHistory.compute(sessionKey, (key, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayDeque<>();
            }
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= maxRequestsPerMinute) {
                allowed[0] = false;
                return timestamps;
            }
            timestamps.addLast(now);
            allowed[0] = true;
            return timestamps;
        });

        return allowed[0];
    }

    // Periodic cleanup every 5 minutes to prevent memory leak from abandoned session keys
    @Scheduled(fixedRate = 300_000)
    public void purgeExpiredSessions() {
        long windowStart = System.currentTimeMillis() - 60_000L;
        int beforeSize = requestHistory.size();
        requestHistory.entrySet().removeIf(entry -> {
            Deque<Long> dq = entry.getValue();
            synchronized (dq) {
                while (!dq.isEmpty() && dq.peekFirst() < windowStart) {
                    dq.pollFirst();
                }
                return dq.isEmpty();
            }
        });
        int removed = beforeSize - requestHistory.size();
        if (removed > 0) {
            log.debug("🧹 Purged {} expired chat rate limiter sessions. Active keys: {}", removed, requestHistory.size());
        }
    }

    public void reset(String sessionKey) {
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

    public int getGlobalMaxRequestsPerMinute() {
        return globalMaxRequestsPerMinute;
    }

    public void setGlobalMaxRequestsPerMinute(int globalMaxRequestsPerMinute) {
        this.globalMaxRequestsPerMinute = globalMaxRequestsPerMinute;
    }
}
