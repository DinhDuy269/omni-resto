package com.omniresto.backend.domain.enums;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

public enum MealPeriod {
    MORNING("Buổi Sáng", "06:00 - 10:30", LocalTime.of(6, 0), LocalTime.of(10, 30)),
    NOON("Buổi Trưa", "10:30 - 14:30", LocalTime.of(10, 30), LocalTime.of(14, 30)),
    BREAK("Giờ Nghỉ Bếp", "14:30 - 16:30", LocalTime.of(14, 30), LocalTime.of(16, 30)),
    EVENING("Buổi Tối", "16:30 - 22:00", LocalTime.of(16, 30), LocalTime.of(22, 0)),
    CLOSED("Đóng Cửa", "22:00 - 06:00", LocalTime.of(22, 0), LocalTime.of(6, 0));

    private final String displayName;
    private final String timeRange;
    private final LocalTime start;
    private final LocalTime end;

    MealPeriod(String displayName, String timeRange, LocalTime start, LocalTime end) {
        this.displayName = displayName;
        this.timeRange = timeRange;
        this.start = start;
        this.end = end;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getTimeRange() {
        return timeRange;
    }

    public LocalTime getStart() {
        return start;
    }

    public LocalTime getEnd() {
        return end;
    }

    public static MealPeriod getCurrentPeriod(LocalTime time) {
        if (time == null) time = LocalTime.now();

        if (!time.isBefore(LocalTime.of(6, 0)) && time.isBefore(LocalTime.of(10, 30))) {
            return MORNING;
        } else if (!time.isBefore(LocalTime.of(10, 30)) && time.isBefore(LocalTime.of(14, 30))) {
            return NOON;
        } else if (!time.isBefore(LocalTime.of(14, 30)) && time.isBefore(LocalTime.of(16, 30))) {
            return BREAK;
        } else if (!time.isBefore(LocalTime.of(16, 30)) && time.isBefore(LocalTime.of(22, 0))) {
            return EVENING;
        }
        return CLOSED;
    }

    /**
     * Kiểm tra một món ăn (với chuỗi mealPeriods ví dụ "MORNING,NOON" hoặc "ALL_DAY")
     * có được phép đặt tại thời điểm time hay không.
     */
    public static boolean isAvailableNow(String mealPeriods, LocalTime time) {
        MealPeriod current = getCurrentPeriod(time);
        if (current == CLOSED) {
            return false;
        }

        if (mealPeriods == null || mealPeriods.isBlank()) {
            return true;
        }
        String upper = mealPeriods.toUpperCase();
        if (upper.contains("ALL_DAY") || upper.contains("ALLDAY")) {
            return true;
        }

        if (current == BREAK) {
            return false;
        }

        List<String> allowed = Arrays.asList(upper.split(","));
        for (String a : allowed) {
            if (a.trim().equals(current.name())) {
                return true;
            }
        }
        return false;
    }

    public static String getPeriodDescription(String mealPeriods) {
        if (mealPeriods == null || mealPeriods.isBlank()) return "Cả ngày";
        String upper = mealPeriods.toUpperCase();
        if (upper.contains("ALL_DAY")) return "Cả ngày (06:00 - 22:00)";
        StringBuilder sb = new StringBuilder();
        if (upper.contains("MORNING")) sb.append("Sáng (06:00 - 10:30) ");
        if (upper.contains("NOON")) sb.append("Trưa (10:30 - 14:30) ");
        if (upper.contains("EVENING")) sb.append("Tối (16:30 - 22:00) ");
        return sb.toString().trim();
    }
}
