package uz.superapp.seed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uz.superapp.domain.Account;
import uz.superapp.domain.Branch;
import uz.superapp.domain.Organization;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.OrganizationRepository;

import java.util.List;

@Component
public class SeedRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrganizationRepository organizationRepository;
    private final BranchRepository branchRepository;

    public SeedRunner(AccountRepository accountRepository, PasswordEncoder passwordEncoder,
            OrganizationRepository organizationRepository, BranchRepository branchRepository) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizationRepository = organizationRepository;
        this.branchRepository = branchRepository;
    }

    @Override
    public void run(String... args) {
        try {
            // Create super admin
            if (accountRepository.findByEmailAndArchivedFalse("admin@admin.com").isEmpty()) {
                Account admin = new Account();
                admin.setEmail("admin@admin.com");
                admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                admin.setFullName("Admin");
                admin.setRole("SUPER_ADMIN");
                accountRepository.save(admin);
                System.out.println("Created super admin: admin@admin.com");
            }

            // Create 100 partners: 30 car washes, 40 gas stations, 30 services
            long orgCount = organizationRepository.findAll().stream().filter(o -> !o.isArchived()).count();
            if (orgCount < 100) {
                System.out.println("Creating partners (current count: " + orgCount + ")...");
                createPartners();
                System.out.println("Partners created successfully!");
            }

            // Create demo partner account
            if (accountRepository.findByEmailAndArchivedFalse("partner@demo.com").isEmpty()) {
                Organization org = organizationRepository.findByArchivedFalse().stream().findFirst().orElse(null);
                if (org != null) {
                    Account partner = new Account();
                    partner.setEmail("partner@demo.com");
                    partner.setPasswordHash(passwordEncoder.encode("Partner1!"));
                    partner.setFullName("Partner Demo");
                    partner.setRole("PARTNER_ADMIN");
                    partner.setOrgId(org.getId());
                    accountRepository.save(partner);
                    System.out.println("Created partner: partner@demo.com");
                }
            }

            System.out.println("SeedRunner completed successfully!");
        } catch (Exception e) {
            System.err.println("ERROR IN SEED RUNNER: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createPartners() {
        String[] carWashNames = {
                "Автомойка 'Чистота'", "Мойка 'Блеск'", "Автомойка 'Вода'", "Мойка 'Стрела'", "Автомойка 'Быстрая'",
                "Мойка 'Кристалл'", "Автомойка 'Звёздная'", "Мойка 'Аква'", "Автомойка 'Премиум'", "Мойка 'Элит'",
                "Автомойка 'Люкс'", "Мойка 'Топ'", "Автомойка 'Супер'", "Мойка 'Профи'", "Автомойка 'Мастер'",
                "Мойка 'Экспресс'", "Автомойка 'Скорость'", "Мойка 'Турбо'", "Автомойка 'Форсаж'", "Мойка 'Ракета'",
                "Автомойка 'Молния'", "Мойка 'Вихрь'", "Автомойка 'Ураган'", "Мойка 'Шторм'", "Автомойка 'Цунами'",
                "Мойка 'Океан'", "Автомойка 'Волна'", "Мойка 'Поток'", "Автомойка 'Река'", "Мойка 'Ручей'"
        };

        String[] gasStationNames = {
                "АЗС 'Нефть'", "Заправка 'Топливо'", "АЗС 'Бензин'", "Заправка 'Дизель'", "АЗС 'Газ'",
                "Заправка 'Энергия'", "АЗС 'Мощность'", "Заправка 'Сила'", "АЗС 'Движение'", "Заправка 'Скорость'",
                "АЗС 'Дорога'", "Заправка 'Путь'", "АЗС 'Маршрут'", "Заправка 'Трасса'", "АЗС 'Шоссе'",
                "Заправка 'Автобан'", "АЗС 'Магистраль'", "Заправка 'Проспект'", "АЗС 'Авеню'", "Заправка 'Бульвар'",
                "АЗС 'Площадь'", "Заправка 'Перекрёсток'", "АЗС 'Развязка'", "Заправка 'Въезд'", "АЗС 'Выезд'",
                "Заправка 'Парковка'", "АЗС 'Стоянка'", "Заправка 'Остановка'", "АЗС 'Терминал'", "Заправка 'Станция'",
                "АЗС 'Пункт'", "Заправка 'Пост'", "АЗС 'База'", "Заправка 'Депо'", "АЗС 'Склад'",
                "Заправка 'Хранилище'", "АЗС 'Резервуар'", "Заправка 'Цистерна'", "АЗС 'Танкер'",
                "Заправка 'Трубопровод'"
        };

        String[] serviceNames = {
                "Сервис 'Мастер'", "СТО 'Профи'", "Сервис 'Эксперт'", "СТО 'Специалист'", "Сервис 'Профессионал'",
                "СТО 'Мастерская'", "Сервис 'Гараж'", "СТО 'Автосервис'", "Сервис 'Техцентр'", "СТО 'Диагностика'",
                "Сервис 'Ремонт'", "СТО 'Восстановление'", "Сервис 'Реставрация'", "СТО 'Реставрация'",
                "Сервис 'Обновление'",
                "СТО 'Модернизация'", "Сервис 'Тюнинг'", "СТО 'Улучшение'", "Сервис 'Оптимизация'", "СТО 'Настройка'",
                "Сервис 'Калибровка'", "СТО 'Регулировка'", "Сервис 'Балансировка'", "СТО 'Выравнивание'",
                "Сервис 'Исправление'",
                "СТО 'Починка'", "Сервис 'Восстановление'", "СТО 'Реанимация'", "Сервис 'Оживление'",
                "СТО 'Реабилитация'"
        };

        String[] addresses = {
                "Ташкент, ул. Навои", "Ташкент, ул. Амира Темура", "Ташкент, пр. Бунёдкор",
                "Ташкент, ул. Шахрисабз", "Ташкент, ул. Чилонзар", "Ташкент, ул. Юнусабад",
                "Ташкент, ул. Сергели", "Ташкент, ул. Мирзо-Улугбек", "Ташкент, ул. Фараби",
                "Ташкент, ул. Алишера Навои"
        };

        String[] phones = {
                "+998901234567", "+998901234568", "+998901234569", "+998901234570", "+998901234571",
                "+998901234572", "+998901234573", "+998901234574", "+998901234575", "+998901234576"
        };

        // Create 30 car washes with branches
        for (int i = 0; i < 30; i++) {
            try {
                Organization org = new Organization();
                org.setName(carWashNames[i]);
                org.setPartnerType("CAR_WASH");
                org.setStatus("ACTIVE");
                org.setDescription("Автомойка полного цикла с современным оборудованием");
                org.setAddress(addresses[i % addresses.length] + " " + (i + 1));
                org.setPhone(phones[i % phones.length]);
                org.setEmail("carwash" + (i + 1) + "@example.com");
                org.setWorkingHours("08:00-22:00");
                org.setRating(4.0 + Math.random() * 1.0);
                org.setReviewCount((int) (10 + Math.random() * 90));
                org.setArchived(false);
                organizationRepository.save(org);
                createBranch(org);
            } catch (Exception e) {
                System.err.println("Failed to create car wash " + i + ": " + e.getMessage());
            }
        }

        // Create 40 gas stations with branches
        for (int i = 0; i < 40; i++) {
            try {
                Organization org = new Organization();
                org.setName(gasStationNames[i]);
                org.setPartnerType("GAS_STATION");
                org.setStatus("ACTIVE");
                org.setDescription("Автозаправочная станция с полным спектром услуг");
                org.setAddress(addresses[i % addresses.length] + " " + (i + 31));
                org.setPhone(phones[i % phones.length]);
                org.setEmail("gas" + (i + 1) + "@example.com");
                org.setWorkingHours("00:00-24:00");
                org.setRating(4.2 + Math.random() * 0.8);
                org.setReviewCount((int) (20 + Math.random() * 80));
                org.setArchived(false);
                organizationRepository.save(org);
                createBranch(org);
            } catch (Exception e) {
                System.err.println("Failed to create gas station " + i + ": " + e.getMessage());
            }
        }

        // Create 30 services with branches
        for (int i = 0; i < 30; i++) {
            try {
                Organization org = new Organization();
                org.setName(serviceNames[i]);
                org.setPartnerType("SERVICE");
                org.setStatus("ACTIVE");
                org.setDescription("Автосервис с диагностикой и ремонтом");
                org.setAddress(addresses[i % addresses.length] + " " + (i + 71));
                org.setPhone(phones[i % phones.length]);
                org.setEmail("service" + (i + 1) + "@example.com");
                org.setWorkingHours("09:00-20:00");
                org.setRating(4.3 + Math.random() * 0.7);
                org.setReviewCount((int) (15 + Math.random() * 85));
                org.setArchived(false);
                organizationRepository.save(org);
                createBranch(org);
            } catch (Exception e) {
                System.err.println("Failed to create service " + i + ": " + e.getMessage());
            }
        }
    }

    private void createBranch(Organization org) {
        Branch branch = new Branch();
        branch.setOrgId(org.getId());
        branch.setName(org.getName() + " - Филиал 1");
        branch.setAddress(org.getAddress());

        Branch.GeoLocation loc = new Branch.GeoLocation();
        loc.setCoordinates(List.of(
                69.2401 + (Math.random() - 0.5) * 0.1, // Longitude
                41.2995 + (Math.random() - 0.5) * 0.1 // Latitude
        ));
        branch.setLocation(loc);

        branch.setPhone(org.getPhone());
        branch.setWorkingHours(org.getWorkingHours());
        branch.setPartnerType(org.getPartnerType());
        branch.setStatus("OPEN");
        branch.setArchived(false);
        branch.setImages(List.of("https://images.unsplash.com/photo-1552664730-d307ca884978?w=800"));
        branchRepository.save(branch);
        System.out.println("  Created branch for: " + org.getName());
    }
}
