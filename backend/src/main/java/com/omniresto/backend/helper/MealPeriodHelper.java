package com.omniresto.backend.helper;

import com.omniresto.backend.domain.enums.MealPeriod;

import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

public final class MealPeriodHelper {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private MealPeriodHelper() {
        // Utility class
    }

    public static MealPeriod getCurrentPeriod(LocalTime time) {
        if (time == null) {
            time = LocalTime.now(DEFAULT_ZONE);
        }

        if (!time.isBefore(LocalTime.of(6, 0)) && time.isBefore(LocalTime.of(10, 30))) {
            return MealPeriod.morning;
        } else if (!time.isBefore(LocalTime.of(10, 30)) && time.isBefore(LocalTime.of(14, 30))) {
            return MealPeriod.noon;
        } else if (!time.isBefore(LocalTime.of(14, 30)) && time.isBefore(LocalTime.of(16, 30))) {
            return MealPeriod.break_time;
        } else if (!time.isBefore(LocalTime.of(16, 30)) && time.isBefore(LocalTime.of(22, 0))) {
            return MealPeriod.evening;
        }
        return MealPeriod.closed;
    }

    public static String getDisplayName(MealPeriod period) {
        if (period == null) return "";
        return switch (period) {
            case morning -> "Buổi Sáng";
            case noon -> "Buổi Trưa";
            case break_time -> "Giờ Nghỉ Bếp";
            case evening -> "Buổi Tối";
            case closed -> "Đóng Cửa";
        };
    }

    public static String getTimeRange(MealPeriod period) {
        if (period == null) return "";
        return switch (period) {
            case morning -> "06:00 - 10:30";
            case noon -> "10:30 - 14:30";
            case break_time -> "14:30 - 16:30";
            case evening -> "16:30 - 22:00";
            case closed -> "22:00 - 06:00";
        };
    }

    public static boolean isAvailableNow(String mealPeriods, LocalTime time) {
        MealPeriod current = getCurrentPeriod(time);
        if (current == MealPeriod.closed) {
            return false;
        }

        if (mealPeriods == null || mealPeriods.isBlank()) {
            return true;
        }
        String upper = mealPeriods.toUpperCase();
        if (upper.contains("ALL_DAY") || upper.contains("ALLDAY")) {
            return true;
        }

        List<String> allowed = Arrays.asList(upper.split(","));
        for (String a : allowed) {
            String item = a.trim();
            if (item.equalsIgnoreCase(current.name())
                    || (current == MealPeriod.break_time && (item.equalsIgnoreCase("BREAK") || item.equalsIgnoreCase("BREAK_TIME")))) {
                return true;
            }
        }

        if (current == MealPeriod.break_time) {
            return false;
        }
        return false;
    }

    public static String getPeriodDescription(String mealPeriods) {
        if (mealPeriods == null || mealPeriods.isBlank()) return "Cả ngày";
        String upper = mealPeriods.toUpperCase();
        if (upper.contains("ALL_DAY") || upper.contains("ALLDAY")) return "Cả ngày (06:00 - 22:00)";
        StringBuilder sb = new StringBuilder();
        if (upper.contains("MORNING")) sb.append("Sáng (06:00 - 10:30) ");
        if (upper.contains("NOON")) sb.append("Trưa (10:30 - 14:30) ");
        if (upper.contains("BREAK")) sb.append("Giờ nghỉ (14:30 - 16:30) ");
        if (upper.contains("EVENING")) sb.append("Tối (16:30 - 22:00) ");
        return sb.toString().trim();
    }
}
