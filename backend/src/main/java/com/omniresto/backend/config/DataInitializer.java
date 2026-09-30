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
    private final OrderRepository orderRepository;

    @Override
    public void run(String... args) throws Exception {
        if (categoryRepository.count() == 0) {
            CategoryEntity cat1 = CategoryEntity.builder().name("Điểm Tâm Sáng").code("BREAKFAST").displayOrder(1).build();
            cat1.setId("cat-01");
            CategoryEntity cat2 = CategoryEntity.builder().name("Cơm Văn Phòng & Bún Trưa").code("LUNCH").displayOrder(2).build();
            cat2.setId("cat-02");
            CategoryEntity cat3 = CategoryEntity.builder().name("Lẩu & Món Nhắm Ca Tối").code("DINNER").displayOrder(3).build();
            cat3.setId("cat-03");
            CategoryEntity cat4 = CategoryEntity.builder().name("Đồ Uống Cả Ngày").code("DRINK").displayOrder(4).build();
            cat4.setId("cat-04");

            categoryRepository.save(cat1);
            categoryRepository.save(cat2);
            categoryRepository.save(cat3);
            categoryRepository.save(cat4);

            if (menuItemRepository.count() == 0) {
                // ── SÁNG (06:00 - 10:30) ──
                MenuItemEntity item1 = MenuItemEntity.builder()
                        .code("XOI-01")
                        .name("Xôi Xéo Gà Xé Nấm Hương")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(45000))
                        .description("Xôi xéo dẻo thơm hạt nếp cái hoa vàng, gà xé đậm đà, hành phi giòn tan và rưới mỡ gà béo ngậy.")
                        .ingredients("Gạo nếp cái hoa vàng, Đậu xanh đồ mịn, Thịt đùi gà xé sợi, Nấm hương Sa Pa, Hành khô phi giòn, Mỡ gà ta")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop")
                        .build();
                item1.setId("m-01");

                MenuItemEntity item2 = MenuItemEntity.builder()
                        .code("BM-01")
                        .name("Bánh Mì Chảo Đặc Biệt Pate Trứng")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(55000))
                        .description("Chảo gang nóng hổi gồm trứng ốp la lòng đào, pate Cột Đèn béo ngậy, xúc xích tiêu đen và sốt cà chua bí truyền.")
                        .ingredients("Bánh mì giòn vỏ, Pate gan heo Cột Đèn, 2 trứng gà ta ốp la, Xúc xích tiêu, Xíu mại thịt băm, Sốt vang cà chua")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1509722747041-616f39b57569?w=500&auto=format&fit=crop")
                        .build();
                item2.setId("m-02");

                MenuItemEntity item3 = MenuItemEntity.builder()
                        .code("BM-02")
                        .name("Bánh Mì Heo Quay Giòn Bì Dưa Chua")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(38000))
                        .description("Bánh mì nướng giòn rụm kẹp thịt ba chỉ heo quay nổ cốm giòn tan, dưa leo và sốt ớt cay ngọt.")
                        .ingredients("Bánh mì nóng giòn, Heo quay nổ cốm da giòn, Dưa leo, Ngò rí, Đồ chua, Nước sốt heo quay thảo quả")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop")
                        .build();
                item3.setId("m-03");

                MenuItemEntity item4 = MenuItemEntity.builder()
                        .code("XOI-02")
                        .name("Xôi Khúc Hoàng Mai Chả Lụa Nóng")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(35000))
                        .description("Hạt xôi mềm dẻo bọc nhân rau khúc tươi thơm nức, đậu xanh tiêu sọ, thịt ba chỉ và kèm 2 lát chả lụa.")
                        .ingredients("Nếp nương dẻo, Lá khúc tươi, Đậu xanh đồ nhuyễn, Thịt ba chỉ rim tiêu sọ, Chả lụa Ước Lễ")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop")
                        .build();
                item4.setId("m-04");

                MenuItemEntity item5 = MenuItemEntity.builder()
                        .code("BC-01")
                        .name("Bánh Cuốn Nóng Thanh Trì Chả Quế")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(40000))
                        .description("Bánh tráng tay mỏng mướt trắng ngần rắc mộc nhĩ thịt băm, chấm nước mắm ấm nóng và chả quế giòn sần sật.")
                        .ingredients("Bột gạo tẻ tráng mỏng, Mộc nhĩ thịt nạc vai băm, Hành phi thơm lừng, Chả quế nướng vàng, Nước mắm chua ngọt")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop")
                        .build();
                item5.setId("m-05");

                MenuItemEntity item6 = MenuItemEntity.builder()
                        .code("CHE-01")
                        .name("Chè Hạt Sen Bọc Nhãn Lồng Bột Sắn")
                        .category(cat1)
                        .basePrice(BigDecimal.valueOf(35000))
                        .description("Món tráng miệng thanh tao giải nhiệt, hạt sen bùi ngậy lồng trong cùi nhãn ngọt giòn, nước đường phèn hoa bưởi.")
                        .ingredients("Hạt sen Huế tươi ninh mềm, Cùi nhãn lồng Hưng Yên, Bột sắn dây hoa bưởi, Đường phèn Quảng Ngãi")
                        .mealPeriods("MORNING")
                        .status(MenuStatus.out_of_stock)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop")
                        .build();
                item6.setId("m-06");

                // ── TRƯA (10:30 - 14:30) ──
                MenuItemEntity item7 = MenuItemEntity.builder()
                        .code("COM-01")
                        .name("Cơm Tấm Sườn Bì Chả Trứng Sài Gòn")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(79000))
                        .description("Sườn cốt lết ướp mật ong nướng than hoa thơm lừng, chả trứng chưng chuẩn vị Sài Gòn, bì giòn và mỡ hành tép mỡ.")
                        .ingredients("Gạo tấm thơm dẻo, Sườn cốt lết nướng than, Bì heo thính gạo rang, Chả trứng mộc nhĩ, Trứng ốp la, Mỡ hành tép mỡ")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop")
                        .build();
                item7.setId("m-07");

                MenuItemEntity item8 = MenuItemEntity.builder()
                        .code("COM-02")
                        .name("Cơm Gà Xối Mỡ Dưa Chua Sốt Cay")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(75000))
                        .description("Góc phần tư đùi gà xối mỡ vàng ươm da giòn rụm, cơm rang hạt ngọc thơm phức, ăn kèm dưa muối giòn chua giải ngấy.")
                        .ingredients("Đùi gà xối mỡ giòn da, Cơm chiên tỏi nghệ, Dưa cải chua xào tóp mỡ, Dưa leo, Cà chua, Nước tương tỏi ớt gừng")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop")
                        .build();
                item8.setId("m-08");

                MenuItemEntity item9 = MenuItemEntity.builder()
                        .code("COM-03")
                        .name("Cơm Cá Basa Kho Tộ Canh Chua Bông Điên Điển")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(72000))
                        .description("Khúc cá basa kho tiêu tộ đất sánh đặc đậm đà keo vị, ăn kèm niêu canh chua cá bông điên điển thanh mát.")
                        .ingredients("Cá basa tươi cắt khúc, Nước hàng dừa Bến Tre, Tiêu đen Phú Quốc, Nước cốt me, Bông điên điển, Bạc hà")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop")
                        .build();
                item9.setId("m-09");

                MenuItemEntity item10 = MenuItemEntity.builder()
                        .code("COM-04")
                        .name("Cơm Bò Lúc Lắc Khoai Tây Chiên Bơ Tỏi")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(85000))
                        .description("Thịt thăn bò Úc thái quân cờ xào lửa lớn sốt tiêu đen bóng mượt, dùng kèm khoai tây chiên bơ vàng ươm.")
                        .ingredients("Thăn bò Úc mềm ngọt, Ớt chuông Đà Lạt, Hành tây xào tiêu đen bơ tỏi, Khoai tây chiên giòn, Cơm thơm lài")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop")
                        .build();
                item10.setId("m-10");

                MenuItemEntity item11 = MenuItemEntity.builder()
                        .code("COM-05")
                        .name("Cơm Sườn Non Rim Mặn Ngọt Mỡ Hành")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(75000))
                        .description("Sườn non heo rim nước mắm tỏi ớt keo lại mặn ngọt đưa cơm, chan mỡ hành thơm phức.")
                        .ingredients("Sườn non heo chọn lọc, Nước mắm cá cơm truyền thống, Tỏi ớt băm nhuyễn, Mỡ hành lá tép mỡ")
                        .mealPeriods("NOON")
                        .status(MenuStatus.out_of_stock)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop")
                        .build();
                item11.setId("m-11");

                MenuItemEntity item12 = MenuItemEntity.builder()
                        .code("BUN-01")
                        .name("Bún Chả Hà Nội Que Tre Than Hồng")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(75000))
                        .description("Thịt ba chỉ thái mỏng và chả băm kẹp que tre nướng than hoa thơm nức mũi, nước chấm đu đủ ấm nóng kèm bún tươi.")
                        .ingredients("Thịt ba chỉ nướng than, Chả viên hành sả nướng que tre, Bún tươi Phú Đô, Đu đủ cà rốt muối chua, Rau sống kinh giới")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop")
                        .build();
                item12.setId("m-12");

                MenuItemEntity item13 = MenuItemEntity.builder()
                        .code("PHO-01")
                        .name("Phở Bò Tái Nạm Gầu Giòn Wagyu")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(89000))
                        .description("Nước dùng phở bò truyền thống hầm xương tủy 24h thơm mùi quế hồi thảo quả, thịt bò Wagyu tái mềm ngọt.")
                        .ingredients("Bò Wagyu thái mỏng, Nạm gầu giòn, Bánh phở tươi Hà Nội, Nước hầm xương bò thảo mộc 24h, Hành hoa, Ngò gai")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop")
                        .build();
                item13.setId("m-13");

                MenuItemEntity item14 = MenuItemEntity.builder()
                        .code("BBH-01")
                        .name("Bún Bò Huế Chả Cua Giò Heo Cay Nồng")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(79000))
                        .description("Nước dùng bún bò hầm xương ống dậy mùi mắm ruốc sả ớt, khoanh giò heo mềm ngậy, chả cua bể và tiết luộc.")
                        .ingredients("Sợi bún to Huế, Bắp bò hoa, Giò heo hầm mềm, Chả cua bể tươi, Nước dùng sả ớt mắm ruốc Bà Duệ")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop")
                        .build();
                item14.setId("m-14");

                MenuItemEntity item15 = MenuItemEntity.builder()
                        .code("BD-01")
                        .name("Bún Đậu Mắm Tôm Thập Cẩm Chả Cốm")
                        .category(cat2)
                        .basePrice(BigDecimal.valueOf(75000))
                        .description("Mẹt bún lá cắt miếng, đậu hũ Mơ rán phồng giòn rụm chấm mắm tôm Thanh Hóa đánh sủi bọt với quất và ớt tươi.")
                        .ingredients("Bún lá tươi cắt con cờ, Đậu hũ Mơ chiên phồng, Chả cốm làng Vòng, Nem rán giòn, Thịt chân giò luộc, Mắm tôm Thanh Hóa")
                        .mealPeriods("NOON")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop")
                        .build();
                item15.setId("m-15");

                // ── TỐI (16:30 - 22:00) ──
                MenuItemEntity item16 = MenuItemEntity.builder()
                        .code("LAU-01")
                        .name("Set Lẩu Riêu Cua Bắp Bò Sườn Sụn")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(389000))
                        .description("Set lẩu riêu cua đồng xịn giã tay dậy mùi giấm bỗng nếp, thịt bắp bò hoa giòn ngọt và sườn sụn non chặt nhỏ.")
                        .ingredients("Cua đồng tươi giã tay gạch béo ngậy, Bắp bò hoa thái mỏng, Sườn sụn non chặt con chì, Giấm bỗng nếp làng Vân, Hoa chuối, Bún tươi")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop")
                        .build();
                item16.setId("m-16");

                MenuItemEntity item17 = MenuItemEntity.builder()
                        .code("LAU-02")
                        .name("Set Lẩu Thái Hải Sản Tomyum Chua Cay")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(429000))
                        .description("Nước lẩu Tomyum đậm đà chuẩn vị Thái với cốt dừa thơm béo, lá chanh kaffir, tôm sú tươi nhảy tanh tách, mực ống và nghêu.")
                        .ingredients("Tôm sú tươi sống, Mực ống câu Cô Tô, Nghêu biển trắng, Nước cốt lẩu Tomyum lá chanh sả ớt cốt dừa, Nấm kim châm, Mì tôm")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop")
                        .build();
                item17.setId("m-17");

                MenuItemEntity item18 = MenuItemEntity.builder()
                        .code("LAU-03")
                        .name("Set Lẩu Gà Lá É Phú Yên Nấm Tuyết")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(369000))
                        .description("Lẩu gà đồi thả vườn thịt săn chắc, nước lẩu ngọt thanh từ xương gà và tiêu xanh cay nồng, nhúng lá é tươi thơm mát.")
                        .ingredients("Gà ta thả đồi 1.4kg, Lá é trắng tươi Phú Yên, Măng củ giòn ngọt, Tiêu xanh cay nồng, Nấm tuyết trắng, Bún tươi")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1547496502-affa22d38842?w=500&auto=format&fit=crop")
                        .build();
                item18.setId("m-18");

                MenuItemEntity item19 = MenuItemEntity.builder()
                        .code("NHU-01")
                        .name("Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(120000))
                        .description("Đĩa thịt ba chỉ bò Black Angus Mỹ thái lát mỏng cuộn tròn vân mỡ hoa đẹp mắt kèm đĩa nấm tươi tổng hợp nhúng lẩu.")
                        .ingredients("Ba chỉ bò Black Angus Mỹ thái lát mỏng, Nấm kim châm, Nấm đùi gà baby, Nấm bào ngư")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop")
                        .build();
                item19.setId("m-19");

                MenuItemEntity item20 = MenuItemEntity.builder()
                        .code("NHU-02")
                        .name("Dĩa Tôm Sú Biển & Mực Trứng Nhúng Lẩu")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(145000))
                        .description("Đĩa hải sản tươi sống gồm 6 con tôm sú biển tươi giòn và mực trứng Phú Quốc béo ngậy.")
                        .ingredients("Tôm sú biển còn bơi, Mực trứng hấp sơ đá lạnh, Nước sốt tiêu chanh ớt xanh")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=500&auto=format&fit=crop")
                        .build();
                item20.setId("m-20");

                MenuItemEntity item21 = MenuItemEntity.builder()
                        .code("NHA-01")
                        .name("Gà Ta Ủ Muối Hoa Tiêu Nửa Con")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(160000))
                        .description("Gà đồi ủ muối hoa tiêu da vàng giòn sần sật, thịt ngọt thơm mùi lá chanh, chấm muối ớt chanh chuẩn vị nhắm bia.")
                        .ingredients("Nửa con gà ta ủ muối, Muối hạt rang thơm, Tiêu sọ Phú Quốc, Lá chanh thái chỉ, Nước chấm sữa ớt đỏ")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop")
                        .build();
                item21.setId("m-21");

                MenuItemEntity item22 = MenuItemEntity.builder()
                        .code("NHA-02")
                        .name("Nộm Tai Heo Bóp Thấu Ngó Sen Giòn Cay")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(85000))
                        .description("Món khai vị nhắm lai rai giòn sần sật, ngó sen ngâm chua ngọt trộn tai heo giòn và lạc rang giã dập.")
                        .ingredients("Tai heo luộc giòn thái chỉ, Ngó sen tươi muối chua ngọt, Rau răm, Húng lủi, Lạc rang giã thô, Nước mắm chua cay")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop")
                        .build();
                item22.setId("m-22");

                MenuItemEntity item23 = MenuItemEntity.builder()
                        .code("NHA-03")
                        .name("Đậu Hũ Lướt Ván Giòn Rụm Chấm Mắm Tôm")
                        .category(cat3)
                        .basePrice(BigDecimal.valueOf(45000))
                        .description("Đậu hũ non lướt chảo dầu sôi da giòn rụm bên trong mềm mịn tan trong miệng.")
                        .ingredients("Đậu hũ non làng Mơ, Hành hoa phi mỡ, Mắm tôm Thanh Hóa đánh sủi bọt quất ớt tươi")
                        .mealPeriods("EVENING")
                        .status(MenuStatus.out_of_stock)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop")
                        .build();
                item23.setId("m-23");

                // ── CẢ NGÀY (06:00 - 22:00) ──
                MenuItemEntity item24 = MenuItemEntity.builder()
                        .code("DRK-01")
                        .name("Trà Sen Vàng Hạt Hạt Cung Đình")
                        .category(cat4)
                        .basePrice(BigDecimal.valueOf(39000))
                        .description("Trà oolong ướp sen Huế tự nhiên kết hợp củ năng giòn rụm ngọt thanh và hạt sen tươi ninh mềm.")
                        .ingredients("Trà oolong sen Huế, Hạt sen tươi ninh mềm, Củ năng giòn ngọt ngào, Kem macchiato béo nhẹ, Đường phèn thanh")
                        .mealPeriods("ALL_DAY")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop")
                        .build();
                item24.setId("m-24");

                MenuItemEntity item25 = MenuItemEntity.builder()
                        .code("DRK-02")
                        .name("Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột")
                        .category(cat4)
                        .basePrice(BigDecimal.valueOf(29000))
                        .description("Cà phê Robusta Đắk Lắk nguyên chất pha phin nhôm truyền thống, hòa quyện sữa đặc thơm béo và đá viên mát lạnh.")
                        .ingredients("Hạt Robusta mộc Buôn Ma Thuột, Sữa đặc có đường Ông Thọ, Đá viên sạch tinh khiết")
                        .mealPeriods("ALL_DAY")
                        .status(MenuStatus.available)
                        .isBestSeller(true)
                        .imageUrl("https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop")
                        .build();
                item25.setId("m-25");

                MenuItemEntity item26 = MenuItemEntity.builder()
                        .code("DRK-03")
                        .name("Cà Phê Muối Kem Béo Xứ Huế")
                        .category(cat4)
                        .basePrice(BigDecimal.valueOf(35000))
                        .description("Cà phê phin đậm vị kết hợp lớp kem sữa mặn béo ngậy chuẩn phong vị Cố Đô.")
                        .ingredients("Cà phê phin Robusta Arabica phối trộn, Lớp kem muối béo mặn nhẹ, Sữa đặc nguyên chất")
                        .mealPeriods("ALL_DAY")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop")
                        .build();
                item26.setId("m-26");

                MenuItemEntity item27 = MenuItemEntity.builder()
                        .code("DRK-04")
                        .name("Trà Đào Cam Sả Tươi Mát Thanh Nhiệt")
                        .category(cat4)
                        .basePrice(BigDecimal.valueOf(42000))
                        .description("Hương vị trà đào ngọt ngào kết hợp cam tươi vắt mọng nước và sả đập dập thơm lừng giải nhiệt.")
                        .ingredients("Trà đen Ceylon hảo hạng, Đào miếng giòn ngọt ngào, Nước cam tươi vắt, Sả cây đập dập, Bạc hà")
                        .mealPeriods("ALL_DAY")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop")
                        .build();
                item27.setId("m-27");

                MenuItemEntity item28 = MenuItemEntity.builder()
                        .code("DRK-05")
                        .name("Nước Ép Dưa Hấu Bạc Hà Tươi Nguyên Chất")
                        .category(cat4)
                        .basePrice(BigDecimal.valueOf(38000))
                        .description("Nước ép dưa hấu đỏ ngọt lịm ép chậm 100% không thêm đường kết hợp lá bạc hà mát lạnh.")
                        .ingredients("Dưa hấu Long An ngọt mọng nước ép chậm, Lá bạc hà vườn, Đá hoa tuyết")
                        .mealPeriods("ALL_DAY")
                        .status(MenuStatus.available)
                        .isBestSeller(false)
                        .imageUrl("https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop")
                        .build();
                item28.setId("m-28");

                menuItemRepository.save(item1);
                menuItemRepository.save(item2);
                menuItemRepository.save(item3);
                menuItemRepository.save(item4);
                menuItemRepository.save(item5);
                menuItemRepository.save(item6);
                menuItemRepository.save(item7);
                menuItemRepository.save(item8);
                menuItemRepository.save(item9);
                menuItemRepository.save(item10);
                menuItemRepository.save(item11);
                menuItemRepository.save(item12);
                menuItemRepository.save(item13);
                menuItemRepository.save(item14);
                menuItemRepository.save(item15);
                menuItemRepository.save(item16);
                menuItemRepository.save(item17);
                menuItemRepository.save(item18);
                menuItemRepository.save(item19);
                menuItemRepository.save(item20);
                menuItemRepository.save(item21);
                menuItemRepository.save(item22);
                menuItemRepository.save(item23);
                menuItemRepository.save(item24);
                menuItemRepository.save(item25);
                menuItemRepository.save(item26);
                menuItemRepository.save(item27);
                menuItemRepository.save(item28);
            }
        }

        // ─ Seed Users / Staff ────────────────────────────────────────────────────────
        if (userRepository.count() == 0) {
            UserEntity u1 = UserEntity.builder()
                    .fullName("Lê Minh Tuấn")
                    .email("admin@omniresto.vn")
                    .phone("0905123456")
                    .password("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK") // admin123
                    .role(RoleType.admin)
                    .status(UserStatus.active)
                    .avatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop")
                    .build();
            u1.setId("usr-01");

            UserEntity u2 = UserEntity.builder()
                    .fullName("Nguyễn Văn Minh")
                    .email("manager@omniresto.vn")
                    .phone("0912345678")
                    .password("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK")
                    .role(RoleType.store_manager)
                    .status(UserStatus.active)
                    .avatar("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop")
                    .build();
            u2.setId("usr-02");

            UserEntity u3 = UserEntity.builder()
                    .fullName("Trần Thị Thu Thảo")
                    .email("cashier@omniresto.vn")
                    .phone("0988777666")
                    .password("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK")
                    .role(RoleType.cashier)
                    .status(UserStatus.active)
                    .avatar("https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop")
                    .build();
            u3.setId("usr-03");

            UserEntity u4 = UserEntity.builder()
                    .fullName("Đỗ Hoàng (Bếp Trưởng)")
                    .email("chef@omniresto.vn")
                    .phone("0933222111")
                    .password("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK")
                    .role(RoleType.chef)
                    .status(UserStatus.active)
                    .avatar("https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop")
                    .build();
            u4.setId("usr-04");

            UserEntity u5 = UserEntity.builder()
                    .fullName("Phạm Hồng Nhung")
                    .email("waiter@omniresto.vn")
                    .phone("0977444333")
                    .password("$2a$10$7EqJtq98hPqEX7fNZaFWoO.8qS.w/uYv6XFv1gA2ZpMqm16s7k1mK")
                    .role(RoleType.waiter)
                    .status(UserStatus.active)
                    .avatar("https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop")
                    .build();
            u5.setId("usr-05");

            userRepository.save(u1);
            userRepository.save(u2);
            userRepository.save(u3);
            userRepository.save(u4);
            userRepository.save(u5);
        }

        // ─ Seed Tables ──────────────────────────────────────────────────────────────
        if (tableRepository.count() == 0) {
            for (int i = 1; i <= 12; i++) {
                TableStatus status = TableStatus.available;
                if (i == 2 || i == 6) status = TableStatus.occupied;
                if (i == 5 || i == 10) status = TableStatus.reserved;

                TableEntity table = TableEntity.builder()
                        .tableNo(String.format("Bàn %02d", i))
                        .capacity(i % 3 == 0 ? 6 : (i % 2 == 0 ? 4 : 2))
                        .status(status)
                        .build();
                table.setId("tbl-" + i);
                tableRepository.save(table);
            }
        }

        // ─ Seed Orders ──────────────────────────────────────────────────────────────
        if (orderRepository.count() == 0) {
            OrderEntity ord1 = OrderEntity.builder()
                    .orderNumber("ORD-8841")
                    .orderType(OrderType.dine_in)
                    .tableId("tbl-6")
                    .tableNo("Bàn 06")
                    .status(OrderStatus.preparing)
                    .totalAmount(BigDecimal.valueOf(256000))
                    .customerName("Anh Tuấn")
                    .paymentMethod(PaymentMethod.qr_code)
                    .build();
            ord1.setId("ord-101");
            ord1.addItem(OrderItemEntity.builder().menuItemId("m-13").itemName("Phở Bò Tái Nạm Gầu Giòn Wagyu").quantity(2).unitPrice(BigDecimal.valueOf(89000)).notes("Không hành lá, nhiều ớt").build());
            ord1.addItem(OrderItemEntity.builder().menuItemId("m-24").itemName("Trà Sen Vàng Hạt Hạt Cung Đình").quantity(2).unitPrice(BigDecimal.valueOf(39000)).build());

            OrderEntity ord2 = OrderEntity.builder()
                    .orderNumber("ORD-9022")
                    .orderType(OrderType.delivery)
                    .status(OrderStatus.pending)
                    .totalAmount(BigDecimal.valueOf(363000))
                    .customerName("Chị Mai Phương (FPT Tower, Tầng 8)")
                    .paymentMethod(PaymentMethod.card)
                    .build();
            ord2.setId("ord-102");
            ord2.addItem(OrderItemEntity.builder().menuItemId("m-07").itemName("Cơm Tấm Sườn Bì Chả Trứng Sài Gòn").quantity(3).unitPrice(BigDecimal.valueOf(79000)).notes("Nhiều mỡ hành tép mỡ").build());
            ord2.addItem(OrderItemEntity.builder().menuItemId("m-27").itemName("Trà Đào Cam Sả Tươi Mát Thanh Nhiệt").quantity(3).unitPrice(BigDecimal.valueOf(42000)).notes("Ít đường, nhiều đá").build());

            OrderEntity ord3 = OrderEntity.builder()
                    .orderNumber("ORD-3310")
                    .orderType(OrderType.dine_in)
                    .tableId("tbl-2")
                    .tableNo("Bàn 02")
                    .status(OrderStatus.ready)
                    .totalAmount(BigDecimal.valueOf(208000))
                    .customerName("Khách bàn 02")
                    .paymentMethod(PaymentMethod.cash)
                    .build();
            ord3.setId("ord-103");
            ord3.addItem(OrderItemEntity.builder().menuItemId("m-12").itemName("Bún Chả Hà Nội Que Tre Than Hồng").quantity(2).unitPrice(BigDecimal.valueOf(75000)).build());
            ord3.addItem(OrderItemEntity.builder().menuItemId("m-25").itemName("Cà Phê Sữa Đá Phin Đậm Đà Buôn Ma Thuột").quantity(2).unitPrice(BigDecimal.valueOf(29000)).build());

            OrderEntity ord4 = OrderEntity.builder()
                    .orderNumber("ORD-8840")
                    .orderType(OrderType.takeaway)
                    .status(OrderStatus.completed)
                    .totalAmount(BigDecimal.valueOf(180000))
                    .customerName("Anh Quốc Tuấn")
                    .paymentMethod(PaymentMethod.qr_code)
                    .build();
            ord4.setId("ord-104");
            ord4.addItem(OrderItemEntity.builder().menuItemId("m-02").itemName("Bánh Mì Chảo Đặc Biệt Pate Trứng").quantity(2).unitPrice(BigDecimal.valueOf(55000)).build());
            ord4.addItem(OrderItemEntity.builder().menuItemId("m-26").itemName("Cà Phê Muối Kem Béo Xứ Huế").quantity(2).unitPrice(BigDecimal.valueOf(35000)).build());

            OrderEntity ord5 = OrderEntity.builder()
                    .orderNumber("ORD-7712")
                    .orderType(OrderType.dine_in)
                    .tableId("tbl-10")
                    .tableNo("Bàn 10")
                    .status(OrderStatus.preparing)
                    .totalAmount(BigDecimal.valueOf(945000))
                    .customerName("Anh Hoàng Nam (Bàn tiệc tối)")
                    .paymentMethod(PaymentMethod.qr_code)
                    .build();
            ord5.setId("ord-105");
            ord5.addItem(OrderItemEntity.builder().menuItemId("m-16").itemName("Set Lẩu Riêu Cua Bắp Bò Sườn Sụn").quantity(1).unitPrice(BigDecimal.valueOf(389000)).notes("Nước dùng cay vừa, thêm rau").build());
            ord5.addItem(OrderItemEntity.builder().menuItemId("m-19").itemName("Dĩa Ba Chỉ Bò Mỹ & Nấm Tươi Nhúng Lẩu").quantity(2).unitPrice(BigDecimal.valueOf(120000)).build());
            ord5.addItem(OrderItemEntity.builder().menuItemId("m-21").itemName("Gà Ta Ủ Muối Hoa Tiêu Nửa Con").quantity(1).unitPrice(BigDecimal.valueOf(160000)).build());
            ord5.addItem(OrderItemEntity.builder().menuItemId("m-24").itemName("Trà Sen Vàng Hạt Hạt Cung Đình").quantity(4).unitPrice(BigDecimal.valueOf(39000)).build());

            orderRepository.save(ord1);
            orderRepository.save(ord2);
            orderRepository.save(ord3);
            orderRepository.save(ord4);
            orderRepository.save(ord5);
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
