package com.omniresto.backend.service;

import com.omniresto.backend.domain.ActionLogEntity;
import com.omniresto.backend.domain.UserEntity;
import com.omniresto.backend.model.actionlog.ActionLogRequest;
import com.omniresto.backend.model.actionlog.ActionLogResponse;
import com.omniresto.backend.repository.ActionLogRepository;
import com.omniresto.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActionLogService {

    private final ActionLogRepository actionLogRepository;
    private final UserRepository userRepository;

    /**
     * Ghi nhận một thao tác người quản lý trên trang Admin.
     */
    @Transactional
    public ActionLogResponse logAction(ActionLogRequest request) {
        String userName = request.getUserName();
        String userRole = request.getUserRole();

        // Nếu thông tin người dùng chưa được truyền hoặc là STAFF_AUTH_USER, thử trích xuất từ SecurityContext
        if (userName == null || userName.isBlank() || "STAFF_AUTH_USER".equalsIgnoreCase(userName)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName()) && !"STAFF_AUTH_USER".equalsIgnoreCase(auth.getName())) {
                String principal = auth.getName();
                Optional<UserEntity> userOpt = userRepository.findById(principal);
                if (userOpt.isEmpty()) {
                    userOpt = userRepository.findByEmail(principal);
                }
                if (userOpt.isEmpty()) {
                    userOpt = userRepository.findByPhone(principal);
                }
                if (userOpt.isPresent()) {
                    UserEntity user = userOpt.get();
                    userName = user.getFullName();
                    userRole = user.getRole() != null ? user.getRole().name() : "STAFF";
                } else {
                    userName = principal;
                }
            }
        }

        // Fallback: đọc từ Header X-Staff-Name nếu có
        if (userName == null || userName.isBlank() || "STAFF_AUTH_USER".equalsIgnoreCase(userName)) {
            try {
                ServletRequestAttributes attrs =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                if (attrs != null) {
                    HttpServletRequest req = attrs.getRequest();
                    String staffNameHeader = req.getHeader("X-Staff-Name");
                    if (staffNameHeader != null && !staffNameHeader.isBlank()) {
                        try {
                            userName = URLDecoder.decode(staffNameHeader, StandardCharsets.UTF_8);
                        } catch (Exception ignored) {
                            userName = staffNameHeader;
                        }
                    }
                    String staffRoleHeader = req.getHeader("X-Staff-Role");
                    if (staffRoleHeader != null && !staffRoleHeader.isBlank()) {
                        userRole = staffRoleHeader;
                    }
                }
            } catch (Exception ignored) {}
        }

        if (userName == null || userName.isBlank() || "STAFF_AUTH_USER".equalsIgnoreCase(userName)) {
            userName = "Quản Trị Viên";
        }

        ActionLogEntity entity = ActionLogEntity.builder()
                .userName(userName)
                .userRole(userRole != null ? userRole : "ADMIN")
                .screen(request.getScreen())
                .feature(request.getFeature())
                .action(request.getAction())
                .build();

        ActionLogEntity saved = actionLogRepository.save(entity);
        log.info("📝 [ACTION LOG] {} ({}) thao tác tại [{}] - [{}]: {}",
                saved.getUserName(), saved.getUserRole(), saved.getScreen(), saved.getFeature(), saved.getAction());

        return mapToResponse(saved);
    }

    /**
     * Helper tiện ích để các Service Backend gọi trực tiếp khi thực hiện thao tác.
     * @param screen Tên màn hình (ví dụ: Menu & Món Ăn, Sơ Đồ Bàn, Nhân Sự...)
     * @param feature Chức năng (ví dụ: Thêm món, Đổi bàn, Khóa nhân viên...)
     * @param action Action (ví dụ: Thêm món Bò sốt tiêu đen, Xóa bàn T-01...)
     */
    public void record(String screen, String feature, String action) {
        try {
            logAction(ActionLogRequest.builder()
                    .screen(screen)
                    .feature(feature)
                    .action(action)
                    .build());
        } catch (Exception e) {
            log.error("Không thể ghi Action Log: {}", e.getMessage());
        }
    }

    /**
     * Lấy danh sách lịch sử thao tác theo bộ lọc màn và từ khóa tìm kiếm
     */
    @Transactional(readOnly = true)
    public Page<ActionLogResponse> getLogs(String screen, String query, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        if ((screen == null || screen.isBlank()) && (query == null || query.isBlank())) {
            return actionLogRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::mapToResponse);
        }
        return actionLogRepository.searchLogs(screen, query, pageable).map(this::mapToResponse);
    }

    /**
     * Thống kê tổng số thao tác, thao tác hôm nay và phân hệ thao tác nhiều nhất
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalLogs = actionLogRepository.count();
        LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long todayLogs = actionLogRepository.countByCreatedAtAfter(startOfToday);

        List<Object[]> screenCounts = actionLogRepository.countLogsByScreen();
        String topScreen = "Chưa có";
        long topScreenCount = 0;
        if (!screenCounts.isEmpty()) {
            Object[] first = screenCounts.get(0);
            topScreen = String.valueOf(first[0]);
            topScreenCount = ((Number) first[1]).longValue();
        }

        stats.put("totalLogs", totalLogs);
        stats.put("todayLogs", todayLogs);
        stats.put("topScreen", topScreen);
        stats.put("topScreenCount", topScreenCount);

        return stats;
    }

    private ActionLogResponse mapToResponse(ActionLogEntity entity) {
        return ActionLogResponse.builder()
                .id(entity.getId())
                .userName(entity.getUserName())
                .userRole(entity.getUserRole())
                .screen(entity.getScreen())
                .feature(entity.getFeature())
                .action(entity.getAction())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
