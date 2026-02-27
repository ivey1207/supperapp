package uz.superapp.seed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uz.superapp.domain.*;
import uz.superapp.domain.Branch.GeoLocation;
import java.util.List;
import java.util.Arrays;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.repository.*;

@Component
public class SeedRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrganizationRepository organizationRepository;
    private final BranchRepository branchRepository;
    private final DeviceRepository deviceRepository;
    private final ServiceRepository serviceRepository;
    private final HardwareKioskRepository hardwareKioskRepository;

    public SeedRunner(AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            OrganizationRepository organizationRepository,
            BranchRepository branchRepository,
            DeviceRepository deviceRepository,
            ServiceRepository serviceRepository,
            HardwareKioskRepository hardwareKioskRepository) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizationRepository = organizationRepository;
        this.branchRepository = branchRepository;
        this.deviceRepository = deviceRepository;
        this.serviceRepository = serviceRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("SeedRunner starting...");
            seedSuperAdmin();
            seedOrganizations();
            seedInactiveDevices();
            System.out.println("SeedRunner completed successfully!");
        } catch (Exception e) {
            System.err.println("ERROR IN SEED RUNNER: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void seedSuperAdmin() {
        accountRepository.findByEmail("admin@admin.com").ifPresentOrElse(
                admin -> {
                    boolean changed = false;
                    if (admin.isArchived()) {
                        admin.setArchived(false);
                        changed = true;
                    }
                    if (!"SUPER_ADMIN".equals(admin.getRole())) {
                        admin.setRole("SUPER_ADMIN");
                        changed = true;
                    }
                    if (!passwordEncoder.matches("Admin1!", admin.getPasswordHash())) {
                        admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                        changed = true;
                    }
                    if (changed) {
                        accountRepository.save(admin);
                        System.out.println("Repaired super admin: admin@admin.com");
                    }
                },
                () -> {
                    Account admin = new Account();
                    admin.setEmail("admin@admin.com");
                    admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                    admin.setFullName("Super Admin");
                    admin.setRole("SUPER_ADMIN");
                    admin.setArchived(false);
                    accountRepository.save(admin);
                    System.out.println("Created super admin: admin@admin.com");
                });
    }

    private void seedOrganizations() {
        // 1. Garage Group
        createPartnerOrg("Garage Group", "CAR_WASH", "garage_group_logo_1772204414116.png", "admin@garage.uz", 3,
                "CAR_WASH");

        // 2. Lafz
        createPartnerOrg("Lafz", "CAR_WASH", "lafz_logo_1772204429157.png", "admin@lafz.uz", 2, "CAR_WASH");

        // 3. Humo Service
        createMixedPartnerOrg("Humo Service", "humo_service_logo_1772204446649.png", "admin@humo.uz");

        // 4. Premium Auto
        createMixedPartnerOrg("Premium Auto", "premium_auto_logo_1772204458981.png", "admin@premium.uz");

        // 5. Fast Fuel
        createMixedPartnerOrg("Fast Fuel", "fast_fuel_logo_1772204475500.png", "admin@fastfuel.uz");
    }

    private void createPartnerOrg(String name, String type, String logo, String email, int branchCount,
            String branchType) {
        if (organizationRepository.findByNameAndArchivedFalse(name).isPresent())
            return;

        Organization org = new Organization();
        org.setName(name);
        org.setPartnerType(type);
        org.setStatus("ACTIVE");
        org.setLogoUrl("/api/v1/files/" + logo);
        org.setEmail(email);
        // Добавляем адрес, телефон и часы работы
        org.setAddress("NIGORA 2 34");
        org.setPhone("+998908192334");
        org.setWorkingHours("09:00-20:00");
        org.setArchived(false);
        organizationRepository.save(org);

        createAccount(email, name + " Admin", org.getId());

        for (int i = 1; i <= branchCount; i++) {
            Branch b = new Branch();
            b.setOrgId(org.getId());
            b.setName(name + " Branch " + i);
            b.setStatus("OPEN");
            b.setPartnerType(branchType);
            b.setPhotoUrl("/api/v1/files/car_wash_photo_1772204498401.png");
            // Заполняем адрес, телефон и часы работы филиала
            b.setAddress(org.getAddress());
            b.setPhone(org.getPhone());
            b.setWorkingHours(org.getWorkingHours());
            b.setArchived(false);
            branchRepository.save(b);
            seedServicesForBranch(org.getId(), b.getId());
            // Создаём нужное количество киосков для филиала
            // Для "Garage Group" и "Lafz" количество киосков равно номеру филиала (i),
            // для остальных организаций – 2 киоска на каждый филиал.
            int kioskCount = 2;
            if ("Garage Group".equals(name) || "Lafz".equals(name)) {
                kioskCount = i; // i is 1‑based index of the branch
            }
            createKiosksForBranch(org.getId(), b.getId(), kioskCount);

        }
        System.out.println("Seeded Organization: " + name);
    }

    private void createMixedPartnerOrg(String name, String logo, String email) {
        if (organizationRepository.findByNameAndArchivedFalse(name).isPresent())
            return;

        Organization org = new Organization();
        org.setName(name);
        org.setPartnerType("SERVICE");
        org.setStatus("ACTIVE");
        org.setLogoUrl("/api/v1/files/" + logo);
        org.setEmail(email);
        // Добавляем адрес, телефон и часы работы
        org.setAddress("NIGORA 2 34");
        org.setPhone("+998908192334");
        org.setWorkingHours("09:00-20:00");
        org.setArchived(false);
        organizationRepository.save(org);

        createAccount(email, name + " Admin", org.getId());

        // Branch 1: Auto Service
        Branch b1 = new Branch();
        b1.setOrgId(org.getId());
        b1.setName(name + " Service Center");
        b1.setStatus("OPEN");
        b1.setPartnerType("SERVICE");
        b1.setPhotoUrl("/api/v1/files/auto_service_photo_1772204512588.png");
        b1.setArchived(false);
        branchRepository.save(b1);
        seedServicesForBranch(org.getId(), b1.getId());
        // Для смешанных организаций создаём по 2 киоска на каждый филиал
        createKiosksForBranch(org.getId(), b1.getId(), 2);

        // Branch 2: GAS Station
        Branch b2 = new Branch();
        b2.setOrgId(org.getId());
        b2.setName(name + " Gas Station");
        b2.setStatus("OPEN");
        b2.setPartnerType("GAS_STATION");
        b2.setPhotoUrl("/api/v1/files/gas_station_photo_1772204527404.png");
        b2.setArchived(false);
        branchRepository.save(b2);
        // Для смешанных организаций создаём по 2 киоска на каждый филиал
        createKiosksForBranch(org.getId(), b2.getId(), 2);

        System.out.println("Seeded Mixed Organization: " + name);
    }

    private void createAccount(String email, String name, String orgId) {
        Account acc = new Account();
        acc.setEmail(email);
        acc.setPasswordHash(passwordEncoder.encode("Partner1!"));
        acc.setFullName(name);
        acc.setRole("PARTNER");
        acc.setOrgId(orgId);
        acc.setArchived(false);
        accountRepository.save(acc);
    }

    private void seedServicesForBranch(String orgId, String branchId) {
        createService(orgId, branchId, "Вода", "Основные", 4000, "W", "00000001", 30, 0, 0, 0, 0);
        createService(orgId, branchId, "Турбо-вода", "Основные", 6000, "T", "00000002", 50, 0, 0, 0, 0);
        createService(orgId, branchId, "Активная химия", "Химия", 5000, "C", "00000004", 40, 0, 0, 13, 0);
        createService(orgId, branchId, "Пена", "Химия", 7000, "F", "00000008", 45, 0, 0, 20, 0);
    }

    // Создаёт указанное количество устройств (Device) для филиала
    private void createDevicesForBranch(String orgId, String branchId, int count) {
        for (int i = 1; i <= count; i++) {
            Device d = new Device();
            d.setName("Device " + i + " for branch " + branchId);
            d.setOrgId(orgId);
            d.setBranchId(branchId);
            // Генерируем простой MAC ID на основе branchId и индекса
            String suffix = branchId.length() > 8 ? branchId.substring(0, 8) : branchId;
            d.setMacId("00:00:00:00:" + suffix + String.format("%02d", i));
            d.setStatus("ACTIVE");
            d.setArchived(false);
            deviceRepository.save(d);
        }
    }

    private void createService(String orgId, String branchId, String name, String cat, int price, String cmd,
            String bits, int freq, int p1, int p2, int p3, int p4) {
        Service s = new Service();
        s.setOrgId(orgId);
        s.setBranchId(branchId);
        s.setName(name);
        s.setCategory(cat);
        s.setPricePerMinute(price);
        s.setCommand(cmd);
        s.setRelayBits(bits);
        s.setMotorFrequency(freq);
        s.setPump1Power(p1);
        s.setPump2Power(p2);
        s.setPump3Power(p3);
        s.setPump4Power(p4);
        s.setActive(true);
        s.setArchived(false);
        serviceRepository.save(s);
    }

    private void seedInactiveDevices() {
        if (deviceRepository.count() < 15) {
            String masterOrgId = organizationRepository.findByNameAndArchivedFalse("SuperApp Master Partner")
                    .map(Organization::getId).orElse(null);

            for (int i = 1; i <= 15; i++) {
                String macId = String.format("00:00:00:00:00:%02X", i);
                if (deviceRepository.findByMacIdAndArchivedFalse(macId).isEmpty()) {
                    Device d = new Device();
                    d.setName("Device " + i);
                    if (masterOrgId != null)
                        d.setOrgId(masterOrgId);
                    d.setMacId(macId);
                    d.setStatus("ACTIVE");
                    d.setArchived(false);
                    deviceRepository.save(d);
                }
            }
        }
        // Создаём киоски для всех уже созданных филиалов
        createKiosksForAllBranches();
    }

    private void createKiosksForAllBranches() {
        // Получаем все активные филиалы
        List<Branch> branches = branchRepository.findByArchivedFalse();
        for (Branch branch : branches) {
            // Если для филиала уже есть киоск, пропускаем
            List<HardwareKiosk> existing = hardwareKioskRepository.findByBranchIdAndArchivedFalse(branch.getId());
            if (!existing.isEmpty())
                continue;
            createKioskForBranch(branch.getOrgId(), branch.getId());
        }
    }

    private void createKioskForBranch(String orgId, String branchId) {
        // Создаёт один киоск – вспомогательный метод для единичного создания
        HardwareKiosk kiosk = new HardwareKiosk();
        kiosk.setName("Kiosk for branch " + branchId);
        String suffix = branchId.length() > 8 ? branchId.substring(0, 8) : branchId;
        kiosk.setKioskId("KIOSK-" + suffix);
        kiosk.setMacId("AA:BB:CC:DD:EE:" + suffix);
        kiosk.setOrgId(orgId);
        kiosk.setBranchId(branchId);
        kiosk.setStatus("ACTIVE");
        kiosk.setArchived(false);
        hardwareKioskRepository.save(kiosk);
    }

    // Создаёт указанное количество киосков для данного филиала
    private void createKiosksForBranch(String orgId, String branchId, int count) {
        for (int i = 1; i <= count; i++) {
            HardwareKiosk kiosk = new HardwareKiosk();
            kiosk.setName("Kiosk " + i + " for branch " + branchId);
            String base = branchId.length() > 8 ? branchId.substring(0, 8) : branchId;
            String suffix = base + String.format("%02d", i);
            kiosk.setKioskId("KIOSK-" + suffix);
            kiosk.setMacId("AA:BB:CC:DD:EE:" + suffix);
            kiosk.setOrgId(orgId);
            kiosk.setBranchId(branchId);
            kiosk.setStatus("ACTIVE");
            kiosk.setArchived(false);
            hardwareKioskRepository.save(kiosk);
        }
    }

}
