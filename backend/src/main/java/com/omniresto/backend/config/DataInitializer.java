package com.omniresto.backend.config;

import com.omniresto.backend.domain.*;
import com.omniresto.backend.domain.enums.*;
import com.omniresto.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final TableRepository tableRepository;
    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final EventRepository eventRepository;
    private final NewsletterSubscriberRepository newsletterSubscriberRepository;

    @Override
    public void run(String... args) throws Exception {
        if (categoryRepository.count() == 0) {
            CategoryEntity cat1 = CategoryEntity.builder().name("Phở & Bún").displayOrder(1).build();
            cat1.setId("cat-01");
            CategoryEntity cat2 = CategoryEntity.builder().name("Cơm & Món Chính").displayOrder(2).build();
            cat2.setId("cat-02");
            CategoryEntity cat3 = CategoryEntity.builder().name("Đồ Uống").displayOrder(3).build();
            cat3.setId("cat-03");

            categoryRepository.save(cat1);
            categoryRepository.save(cat2);
            categoryRepository.save(cat3);

            if (menuItemRepository.count() == 0) {
                MenuItemEntity item1 = MenuItemEntity.builder()
                        .code("PHO-01")
                        .name("Phở Bò Tái Nạm Đặc Biệt")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(89000))
                        .description("Nước dùng hầm xương 24h truyền thống, thịt bò Wagyu tái nạm mềm thơm ngậy.")
                        .ingredients("Bò Wagyu thái mỏng, Nạm bò gừng, Bánh phở tươi Hà Nội, Hành hoa, Ngò gai, Nước hầm xương bò 24h thảo mộc")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop")
                        .build();
                item1.setId("m-01");

                MenuItemEntity item2 = MenuItemEntity.builder()
                        .code("COM-01")
                        .name("Cơm Tấm Sườn Bì Chả Trứng")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(85000))
                        .description("Sườn nướng mật ong đậm đà, chả trứng chưng chuẩn vị Sài Gòn.")
                        .ingredients("Gạo tấm thơm, Sườn nướng mật ong hoa cà phê, Bì heo thính, Chả trứng hấp mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop")
                        .build();
                item2.setId("m-02");

                menuItemRepository.save(item1);
                menuItemRepository.save(item2);
            }
        }

        if (tableRepository.count() == 0) {
            for (int i = 1; i <= 10; i++) {
                TableEntity table = TableEntity.builder()
                        .tableNo(String.format("Bàn %02d", i))
                        .capacity(i % 2 == 0 ? 4 : 2)
                        .status(i == 2 ? TableStatus.occupied : TableStatus.available)
                        .build();
                table.setId("tbl-" + i);
                tableRepository.save(table);
            }
        }

        // ─ Seed Reservations for testing ──────────────────────────────────────────────
        if (reservationRepository.count() == 0) {
            LocalDate today = LocalDate.now();
            LocalDate tomorrow = today.plusDays(1);
            LocalDate nextWeek = today.plusDays(7);

            // Reservation 1 — confirmed, assigned table, today
            ReservationEntity r1 = ReservationEntity.builder()
                    .customerName("Nguyễn Thị Lan")
                    .customerPhone("0901234567")
                    .customerEmail("lan.nguyen@gmail.com")
                    .partySize(4)
                    .reservationDate(today)
                    .reservationTime(LocalTime.of(18, 0))
                    .tableNo("Bàn 05")
                    .notes("Ngồi gần cửa sổ, kỷ niệm sinh nhật")
                    .status(ReservationStatus.confirmed)
                    .build();
            r1.setId("rsv-001");

            // Reservation 2 — pending, today
            ReservationEntity r2 = ReservationEntity.builder()
                    .customerName("Trần Văn Hùng")
                    .customerPhone("0912888999")
                    .partySize(2)
                    .reservationDate(today)
                    .reservationTime(LocalTime.of(19, 30))
                    .status(ReservationStatus.pending)
                    .build();
            r2.setId("rsv-002");

            // Reservation 3 — confirmed, today
            ReservationEntity r3 = ReservationEntity.builder()
                    .customerName("Lê Thị Phương")
                    .customerPhone("0988555444")
                    .customerEmail("phuong.le@yahoo.com")
                    .partySize(6)
                    .reservationDate(today)
                    .reservationTime(LocalTime.of(20, 0))
                    .notes("Tiệc công ty, cần phòng riêng")
                    .status(ReservationStatus.confirmed)
                    .build();
            r3.setId("rsv-003");

            // Reservation 4 — pending, tomorrow
            ReservationEntity r4 = ReservationEntity.builder()
                    .customerName("Phạm Minh Đức")
                    .customerPhone("0933111222")
                    .partySize(3)
                    .reservationDate(tomorrow)
                    .reservationTime(LocalTime.of(12, 0))
                    .status(ReservationStatus.pending)
                    .build();
            r4.setId("rsv-004");

            // Reservation 5 — seated, today
            ReservationEntity r5 = ReservationEntity.builder()
                    .customerName("Hoàng Anh Tú")
                    .customerPhone("0977333666")
                    .partySize(8)
                    .reservationDate(today)
                    .reservationTime(LocalTime.of(18, 30))
                    .tableNo("Bàn 10")
                    .status(ReservationStatus.seated)
                    .build();
            r5.setId("rsv-005");

            // Reservation 6 — pending, next week
            ReservationEntity r6 = ReservationEntity.builder()
                    .customerName("Nguyễn Anh Khữu")
                    .customerPhone("0911222333")
                    .customerEmail("khuu@gmail.com")
                    .partySize(5)
                    .reservationDate(nextWeek)
                    .reservationTime(LocalTime.of(19, 0))
                    .notes("Kỷ niệm ngày cưới")
                    .status(ReservationStatus.pending)
                    .build();
            r6.setId("rsv-006");

            reservationRepository.save(r1);
            reservationRepository.save(r2);
            reservationRepository.save(r3);
            reservationRepository.save(r4);
            reservationRepository.save(r5);
            reservationRepository.save(r6);
        }

        // ─ Seed Events ──────────────────────────────────────────────────────────────
        if (eventRepository.count() == 0) {
            LocalDate today = LocalDate.now();

            EventEntity ev1 = EventEntity.builder()
                    .title("Tiệc Ẩm Thực Cuối Tuần — Đặc Sản Hà Nội Xưa")
                    .shortDescription("Trải nghiệm bữa tiệc với 12 món ăn truyền thống Hà Nội được chắt lọc từ thập niên 60-70.")
                    .description("Chúng tôi trân trọng kính mời Quý Khách tham dự Tiệc Ẩm Thực Cuối Tuần với chủ đề 'Đặc Sản Hà Nội Xưa'. Sự kiện quy tụ 12 món ăn tinh hoa được phục dựng từ công thức gia truyền, phục vụ trong không gian hoài cổ đặc trưng.")
                    .eventDate(today.plusDays(5))
                    .startTime(LocalTime.of(18, 30))
                    .endTime(LocalTime.of(21, 30))
                    .location("OmniResto, 42 Tràng Tiền, Hà Nội")
                    .imageUrl("https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop")
                    .price(BigDecimal.valueOf(450000))
                    .maxCapacity(60)
                    .registeredCount(34)
                    .isFeatured(true)
                    .tags("ẩm thực,hà nội,cuối tuần")
                    .status(EventStatus.upcoming)
                    .build();
            ev1.setId("evt-001");

            EventEntity ev2 = EventEntity.builder()
                    .title("Đêm Nhạc Jazz & Fine Dining")
                    .shortDescription("Tận hưởng âm nhạc Jazz sống cùng thực đơn 5 món tinh tế tại không gian sang trọng.")
                    .description("Một tối thứ Sáu đặc biệt với ban nhạc Jazz trực tiếp từ Hà Nội và thực đơn 5 món do Head Chef OmniResto thiết kế riêng cho sự kiện. Set menu bao gồm rượu vang nhập khẩu và dessert đặc biệt.")
                    .eventDate(today.plusDays(12))
                    .startTime(LocalTime.of(19, 0))
                    .endTime(LocalTime.of(22, 30))
                    .location("OmniResto Lounge, 88 Nguyễn Huệ, TP.HCM")
                    .imageUrl("https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop")
                    .price(BigDecimal.valueOf(850000))
                    .maxCapacity(40)
                    .registeredCount(28)
                    .isFeatured(true)
                    .tags("nhạc jazz,fine dining,thứ sáu")
                    .status(EventStatus.upcoming)
                    .build();
            ev2.setId("evt-002");

            EventEntity ev3 = EventEntity.builder()
                    .title("Workshop Học Nấu Phở Truyền Thống")
                    .shortDescription("Học bí quyết nấu phở từ đầu bếp OmniResto — từ hầm xương đến hoàn thiện tô phở chuẩn.")
                    .description("Buổi workshop thực hành 3 tiếng với quy mô nhỏ (tối đa 20 người) giúp bạn nắm vững kỹ thuật nấu nước dùng phở truyền thống Hà Nội. Mỗi học viên sẽ tự tay hoàn thiện tô phở và mang về bí quyết riêng.")
                    .eventDate(today.plusDays(18))
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(12, 0))
                    .location("OmniResto — Bếp trình diễn tầng 2")
                    .imageUrl("https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop")
                    .price(BigDecimal.valueOf(350000))
                    .maxCapacity(20)
                    .registeredCount(15)
                    .isFeatured(false)
                    .tags("workshop,nấu ăn,phở")
                    .status(EventStatus.upcoming)
                    .build();
            ev3.setId("evt-003");

            EventEntity ev4 = EventEntity.builder()
                    .title("Khuyến Mãi Sinh Nhật — Tháng " + today.getMonthValue())
                    .shortDescription("Sinh nhật trong tháng được tặng miễn phí 1 món tráng miệng đặc biệt và bánh sinh nhật mini.")
                    .description("Áp dụng tại OmniResto trong suốt tháng " + today.getMonthValue() + ". Khách hàng có sinh nhật trong tháng chỉ cần xuất trình CCCD hoặc giấy tờ chứng minh để nhận ưu đãi đặc biệt từ nhà hàng.")
                    .eventDate(today.withDayOfMonth(1))
                    .location("Nhà hàng OmniResto")
                    .imageUrl("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop")
                    .price(BigDecimal.ZERO)
                    .isFeatured(false)
                    .tags("khuyến mãi,sinh nhật")
                    .status(EventStatus.ongoing)
                    .build();
            ev4.setId("evt-004");

            eventRepository.save(ev1);
            eventRepository.save(ev2);
            eventRepository.save(ev3);
            eventRepository.save(ev4);
        }
    }
}
