package com.omniresto.backend.helper;

import com.omniresto.backend.domain.enums.MealPeriod;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class MealPeriodHelperTest {

    @Test
    void testBreakTimeAvailability() {
        // 15:00 nằm trong giờ nghỉ bếp (14:30 - 16:30)
        LocalTime breakTime = LocalTime.of(15, 0);
        assertEquals(MealPeriod.break_time, MealPeriodHelper.getCurrentPeriod(breakTime));

        // Món ALL_DAY phải phục vụ
        assertTrue(MealPeriodHelper.isAvailableNow("ALL_DAY", breakTime));
        assertTrue(MealPeriodHelper.isAvailableNow("ALLDAY", breakTime));
        assertTrue(MealPeriodHelper.isAvailableNow("", breakTime));
        assertTrue(MealPeriodHelper.isAvailableNow(null, breakTime));

        // Món có BREAK phải phục vụ
        assertTrue(MealPeriodHelper.isAvailableNow("BREAK", breakTime));
        assertTrue(MealPeriodHelper.isAvailableNow("NOON,BREAK,EVENING", breakTime));

        // Món chỉ bán các ca nấu ăn sáng/trưa/tối KHÔNG được phục vụ trong giờ nghỉ bếp
        assertFalse(MealPeriodHelper.isAvailableNow("MORNING", breakTime));
        assertFalse(MealPeriodHelper.isAvailableNow("NOON", breakTime));
        assertFalse(MealPeriodHelper.isAvailableNow("EVENING", breakTime));
        assertFalse(MealPeriodHelper.isAvailableNow("MORNING,NOON,EVENING", breakTime));
    }

    @Test
    void testClosedTimeAvailability() {
        // 23:00 đóng cửa
        LocalTime closedTime = LocalTime.of(23, 0);
        assertEquals(MealPeriod.closed, MealPeriodHelper.getCurrentPeriod(closedTime));

        assertFalse(MealPeriodHelper.isAvailableNow("ALL_DAY", closedTime));
        assertFalse(MealPeriodHelper.isAvailableNow("MORNING", closedTime));
    }

    @Test
    void testNormalMealPeriods() {
        // 08:00 ca sáng
        LocalTime morningTime = LocalTime.of(8, 0);
        assertEquals(MealPeriod.morning, MealPeriodHelper.getCurrentPeriod(morningTime));
        assertTrue(MealPeriodHelper.isAvailableNow("MORNING", morningTime));
        assertTrue(MealPeriodHelper.isAvailableNow("ALL_DAY", morningTime));
        assertFalse(MealPeriodHelper.isAvailableNow("NOON", morningTime));
    }
}
