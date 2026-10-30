package com.omniresto.backend.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import lombok.Getter;

import java.time.LocalTime;

@Getter
public enum OperatingShift {
    morning("Buổi Sáng", "06:00 - 10:30", LocalTime.of(6, 0), LocalTime.of(10, 30), true),
    noon("Buổi Trưa", "10:30 - 14:30", LocalTime.of(10, 30), LocalTime.of(14, 30), true),
    break_time("Giờ Nghỉ Bếp", "14:30 - 16:30", LocalTime.of(14, 30), LocalTime.of(16, 30), false),
    evening("Buổi Tối", "16:30 - 22:00", LocalTime.of(16, 30), LocalTime.of(22, 0), true),
    closed("Đóng Cửa", "22:00 - 06:00", LocalTime.of(22, 0), LocalTime.of(6, 0), false);

    private final String name;
    private final String timeRange;
    private final LocalTime startTime;
    private final LocalTime endTime;
    private final boolean isOpen;

    OperatingShift(String name, String timeRange, LocalTime startTime, LocalTime endTime, boolean isOpen) {
        this.name = name;
        this.timeRange = timeRange;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isOpen = isOpen;
    }

    @JsonCreator
    public static OperatingShift fromString(String value) {
        if (value == null || value.isBlank()) return null;
        for (OperatingShift s : values()) {
            if (s.name().equalsIgnoreCase(value.trim()) || (value.trim().equalsIgnoreCase("break") && s == break_time)) {
                return s;
            }
        }
        return null;
    }

    public static OperatingShift fromTime(LocalTime time) {
        // Buổi sáng: 06:00 <= time < 10:30
        if (!time.isBefore(LocalTime.of(6, 0)) && time.isBefore(LocalTime.of(10, 30))) {
            return morning;
        }
        // Buổi trưa: 10:30 <= time < 14:30
        if (!time.isBefore(LocalTime.of(10, 30)) && time.isBefore(LocalTime.of(14, 30))) {
            return noon;
        }
        // Giờ nghỉ bếp: 14:30 <= time < 16:30
        if (!time.isBefore(LocalTime.of(14, 30)) && time.isBefore(LocalTime.of(16, 30))) {
            return break_time;
        }
        // Buổi tối: 16:30 <= time < 22:00
        if (!time.isBefore(LocalTime.of(16, 30)) && time.isBefore(LocalTime.of(22, 0))) {
            return evening;
        }
        // Đóng cửa: từ 22:00 tối đến trước 06:00 sáng
        return closed;
    }
}
