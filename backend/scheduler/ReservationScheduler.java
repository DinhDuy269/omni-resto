package com.omniresto.backend.scheduler;

import com.omniresto.backend.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReservationScheduler {

    private final ReservationService reservationService;

    // Chạy ngầm định kỳ mỗi 60 giây (1 phút)
    @Scheduled(fixedRate = 60000)
    public void scheduleAutoCancelLateReservations() {
        int cancelledCount = reservationService.autoCancelExpiredReservations();
        if (cancelledCount > 0) {
            log.info("==> [SCHEDULER] Đã tự động hủy {} đơn đặt bàn do trễ hẹn quá 30 phút.", cancelledCount);
        }
    }
}