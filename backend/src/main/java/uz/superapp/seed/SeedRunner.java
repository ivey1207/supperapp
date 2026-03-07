package uz.superapp.seed;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uz.superapp.domain.*;
import uz.superapp.domain.Branch.GeoLocation;
import java.util.List;
import java.util.Arrays;
import org.springframework.jdbc.core.JdbcTemplate;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.repository.*;

@Component
public class SeedRunner implements CommandLineRunner {

    @Value("${SEED_DATABASE:false}")
    private boolean seedDatabase;

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrganizationRepository organizationRepository;
    private final BranchRepository branchRepository;
    private final DeviceRepository deviceRepository;
    private final ServiceRepository serviceRepository;
    private final HardwareKioskRepository hardwareKioskRepository;
    private final JdbcTemplate jdbcTemplate;

    public SeedRunner(AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            OrganizationRepository organizationRepository,
            BranchRepository branchRepository,
            DeviceRepository deviceRepository,
            ServiceRepository serviceRepository,
            HardwareKioskRepository hardwareKioskRepository,
            JdbcTemplate jdbcTemplate) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizationRepository = organizationRepository;
        this.branchRepository = branchRepository;
        this.deviceRepository = deviceRepository;
        this.serviceRepository = serviceRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            if (!seedDatabase) {
                System.out.println("SeedRunner: SEED_DATABASE is false. Skipping seed processes.");
                return;
            }

            System.out.println("SeedRunner starting...");

            // Manual migration for missing columns if Hibernate fails to update
            try {
                System.out.println("Checking database schema for missing columns...");
                jdbcTemplate.execute(
                        "ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_mobile_service BOOLEAN DEFAULT FALSE");
                jdbcTemplate.execute(
                        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_specialist BOOLEAN DEFAULT FALSE");
                jdbcTemplate.execute(
                        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE");
                jdbcTemplate.execute(
                        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION");
                jdbcTemplate.execute(
                        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS current_lon DOUBLE PRECISION");
                jdbcTemplate.execute(
                        "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP WITH TIME ZONE");
                System.out.println("Database schema checked/updated.");
            } catch (Exception e) {
                System.err.println("Database migration failed: " + e.getMessage());
            }

            seedSuperAdmin();

            long garageCount = organizationRepository.findAll().stream()
                    .filter(org -> "Garage Group".equals(org.getName()))
                    .count();

            boolean forceReSeed = "true".equalsIgnoreCase(System.getenv("FORCE_RESEED"));

            if (garageCount > 1 || forceReSeed) {
                System.out.println("SeedRunner: Wiping database (FORCE_RESEED=" + forceReSeed + ").");
                wipeDatabase();
                seedInactiveDevices();
                seedOrganizations();
            } else if (organizationRepository.count() == 0 || (branchRepository.count() == 0)) {
                System.out.println("SeedRunner: Database empty or missing branches. Seeding initial data.");
                seedInactiveDevices();
                seedOrganizations();
            } else {
                System.out.println("SeedRunner: Database already seeded correctly. Skipping mock data creation.");
            }

            System.out.println("SeedRunner completed successfully!");
        } catch (Exception e) {
            System.err.println("ERROR IN SEED RUNNER: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void wipeDatabase() {
        System.out.println("Wiping database...");
        organizationRepository.deleteAll();
        branchRepository.deleteAll();
        hardwareKioskRepository.deleteAll();
        serviceRepository.deleteAll();
        deviceRepository.deleteAll(); // Force clean devices too

        List<Account> accounts = accountRepository.findAll();
        for (Account acc : accounts) {
            if (!"SUPER_ADMIN".equals(acc.getRole())) {
                accountRepository.delete(acc);
            }
        }
        System.out.println("Database wiped.");
    }

    private void seedSuperAdmin() {
        boolean forceReset = "true".equalsIgnoreCase(System.getenv("FORCE_RESET_ADMIN"));
        List<String> adminEmails = Arrays.asList("admin@admin.uz", "admin@admin.com");

        for (String email : adminEmails) {
            accountRepository.findFirstByEmail(email).ifPresentOrElse(
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
                        if (admin.getPasswordHash() == null || admin.getPasswordHash().isEmpty() || forceReset) {
                            admin.setPasswordHash(passwordEncoder.encode("admin123"));
                            changed = true;
                            if (forceReset) {
                                System.out.println("Force-resetting super admin password to default for: " + email);
                            }
                        }
                        if (changed) {
                            accountRepository.save(admin);
                            System.out.println("Repaired super admin: " + email);
                        }
                    },
                    () -> {
                        Account admin = new Account();
                        admin.setEmail(email);
                        admin.setPasswordHash(passwordEncoder.encode("admin123"));
                        admin.setFullName("Super Admin");
                        admin.setRole("SUPER_ADMIN");
                        admin.setArchived(false);
                        accountRepository.save(admin);
                        System.out.println("Created super admin: " + email);
                    });
        }
    }

    private void seedOrganizations() {
        createPartnerOrg("Garage Group", "305123456", "CAR_WASH", "garage_group_logo_1772204414116.png",
                "admin@garage.uz", "Tashkent, Chilonzor 15", "+998901234567", "08:00-22:00",
                "A premium car wash network in Tashkent.", 3, "CAR_WASH", 0.0);

        createPartnerOrg("Lafz", "306987654", "CAR_WASH", "lafz_logo_1772204429157.png",
                "admin@lafz.uz", "Tashkent, Yunusobod 19", "+998909876543", "09:00-21:00",
                "High quality car wash services.", 2, "CAR_WASH", 0.05);

        createMixedPartnerOrg("Humo Service", "308112233", "humo_service_logo_1772204446649.png",
                "admin@humo.uz", "Tashkent, Mirobod 5", "+998931122334", "00:00-23:59",
                "Reliable auto service and fuel station.", 0.1);

        createMixedPartnerOrg("Premium Auto", "309554433", "premium_auto_logo_1772204458981.png",
                "admin@premium.uz", "Tashkent, Yakkasaroy 10", "+998945544332", "09:00-20:00",
                "Premium auto services and detailing.", 0.15);

        createMixedPartnerOrg("Mustang SOS", "311667788", "mustang_sos_logo_1772204489900.png",
                "sos@mustang.uz", "Tashkent, Ring Road", "+998901112233", "00:00-23:59",
                "Emergency road assistance and mobile wash.", 0.25);
    }

    private void createPartnerOrg(String name, String inn, String type, String logo, String email,
            String address, String phone, String workingHours, String desc, int branchCount, String branchType,
            double jitter) {

        Organization org = new Organization();
        org.setName(name);
        org.setInn(inn);
        org.setPartnerType(type);
        org.setStatus("ACTIVE");
        org.setLogoUrl(logo);
        org.setEmail(email);
        org.setAddress(address);
        org.setPhone(phone);
        org.setWorkingHours(workingHours);
        org.setDescription(desc);
        org.setArchived(false);
        organizationRepository.save(org);

        createAccount(email, name + " Admin", org.getId(), "PARTNER_ADMIN");

        for (int i = 1; i <= branchCount; i++) {
            Branch b = new Branch();
            b.setOrgId(org.getId());
            b.setName(name + " Branch " + i);
            b.setStatus("OPEN");
            b.setPartnerType(branchType);
            b.setPhotoUrl("car_wash_photo_1772204498401.png");
            b.setAddress(address + ", Sector " + i);
            b.setPhone(phone);
            b.setWorkingHours(workingHours);

            GeoLocation loc = new GeoLocation();
            loc.setCoordinates(Arrays.asList(69.2797 + jitter + (i * 0.01), 41.2995 + jitter + (i * 0.01)));
            b.setLocation(loc);

            b.setArchived(false);
            branchRepository.save(b);

            seedServicesForBranch(org.getId(), b.getId(), branchType, i);

            int kioskCount = 2;
            if ("Garage Group".equals(name) || "Lafz".equals(name)) {
                kioskCount = i;
            }
            assignExistingDevicesForBranch(org.getId(), b.getId(), kioskCount);
        }
        System.out.println("Seeded Organization: " + name);
    }

    private void createMixedPartnerOrg(String name, String inn, String logo, String email,
            String address, String phone, String workingHours, String desc, double jitter) {

        Organization org = new Organization();
        org.setName(name);
        org.setInn(inn);
        org.setPartnerType("SERVICE");
        org.setStatus("ACTIVE");
        org.setLogoUrl(logo);
        org.setEmail(email);
        org.setAddress(address);
        org.setPhone(phone);
        org.setWorkingHours(workingHours);
        org.setDescription(desc);
        org.setArchived(false);
        organizationRepository.save(org);

        createAccount(email, name + " Admin", org.getId(), "PARTNER_ADMIN");

        // Branch 1: Auto Service
        Branch b1 = new Branch();
        b1.setOrgId(org.getId());
        b1.setName(name + " Service Center");
        b1.setStatus("OPEN");
        b1.setPartnerType("SERVICE");
        b1.setPhotoUrl("auto_service_photo_1772204512588.png");
        b1.setAddress(address + " (Service)");
        b1.setPhone(phone);
        b1.setWorkingHours(workingHours);

        GeoLocation loc1 = new GeoLocation();
        loc1.setCoordinates(Arrays.asList(69.28 + jitter, 41.30 + jitter));
        b1.setLocation(loc1);

        b1.setMobileService(true);
        b1.setArchived(false);
        branchRepository.save(b1);

        seedServicesForBranch(org.getId(), b1.getId(), "SERVICE", 1);
        assignExistingDevicesForBranch(org.getId(), b1.getId(), 2);

        // Branch 2: GAS Station
        Branch b2 = new Branch();
        b2.setOrgId(org.getId());
        b2.setName(name + " Gas Station");
        b2.setStatus("OPEN");
        b2.setPartnerType("GAS_STATION");
        b2.setPhotoUrl("gas_station_photo_1772204527404.png");
        b2.setAddress(address + " (Gas Station)");
        b2.setPhone(phone);
        b2.setWorkingHours(workingHours);

        GeoLocation loc2 = new GeoLocation();
        loc2.setCoordinates(Arrays.asList(69.29 + jitter, 41.31 + jitter));
        b2.setLocation(loc2);

        b2.setArchived(false);
        branchRepository.save(b2);

        assignExistingDevicesForBranch(org.getId(), b2.getId(), 2);

        System.out.println("Seeded Mixed Organization: " + name);
    }

    private void createAccount(String email, String name, String orgId, String role) {
        Account acc = new Account();
        acc.setEmail(email);
        acc.setPasswordHash(passwordEncoder.encode("Partner1!"));
        acc.setFullName(name);
        acc.setRole(role);
        acc.setOrgId(orgId);
        acc.setArchived(false);
        accountRepository.save(acc);
    }

    private void seedServicesForBranch(String orgId, String branchId, String type, int index) {
        if ("GAS_STATION".equals(type)) {
            createService(orgId, branchId, "Бензин АИ-92", "Топливо", 10200 + (index * 100), "G92", "00000001", 0,
                    index, 0, 0, 0);
            createService(orgId, branchId, "Бензин АИ-95", "Топливо", 12500 + (index * 150), "G95", "00000002", 0, 0, 0,
                    0, 0);
        } else if ("SERVICE".equals(type)) {
            createService(orgId, branchId, "Замена масла", "Ремонт", 50000 + (index * 5000), "OIL", "00000001", 0, 0, 0,
                    0, 0);
            createService(orgId, branchId, "Балансировка", "Шиномонтаж", 30000 + (index * 2000), "BAL", "00000002", 0,
                    0, 0, 0, 0);
        } else {
            // Default CAR_WASH
            createService(orgId, branchId, "Вода", "Основные", 4000 + (index * 500), "W", "00000001", 30, 0, 0, 0, 0);
            createService(orgId, branchId, "Турбо-вода", "Основные", 6000 + (index * 400), "T", "00000002", 50, 0, 0, 0,
                    0);
            createService(orgId, branchId, "Активная химия", "Химия", 5000 + (index * 300), "C", "00000004", 40, 0, 0,
                    13, 0);
            createService(orgId, branchId, "Пена", "Химия", 7000 + (index * 600), "F", "00000008", 45, 0, 0, 20, 0);
        }
    }

    // Присваивает уже существующие устройства и создаёт для них киоски с ТЕМ ЖЕ MAC
    // адресом
    private void assignExistingDevicesForBranch(String orgId, String branchId, int count) {
        // Fetch only those devices that truly have NO branchId assigned yet in DB.
        // Because Spring Data save() might be delayed if not in a transaction,
        // we use a loop with manual DB refetching and limit 1.
        int assigned = 0;
        for (int i = 0; i < count; i++) {
            List<Device> available = deviceRepository.findByBranchIdIsNullAndArchivedFalse();
            if (available.isEmpty()) {
                break;
            }

            Device d = available.get(0); // take the first available

            d.setOrgId(orgId);
            d.setBranchId(branchId);
            d.setStatus("ACTIVE");
            deviceRepository.save(d);

            // Double check existence for macId to avoid DuplicateKeyException
            if (hardwareKioskRepository.findByMacIdAndArchivedFalse(d.getMacId()).isEmpty()) {
                HardwareKiosk kiosk = new HardwareKiosk();
                kiosk.setName("Kiosk " + (assigned + 1) + " for branch " + branchId);
                kiosk.setKioskId("KIOSK-" + d.getMacId().replace(":", "").substring(6)); // последняя часть MAC
                kiosk.setMacId(d.getMacId()); // ТОТ ЖЕ MAC
                kiosk.setOrgId(orgId);
                kiosk.setBranchId(branchId);
                kiosk.setStatus("ACTIVE");
                kiosk.setArchived(false);
                hardwareKioskRepository.save(kiosk);
            } else {
                System.out.println("Skipping existing kiosk for MAC: " + d.getMacId());
            }

            assigned++;
        }

        if (assigned < count) {
            System.out.println("Warning: Not enough existing devices for org " + orgId + " branch " + branchId
                    + ". Needed " + count + ", assigned " + assigned);
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
        if (deviceRepository.count() < 20) {
            String masterOrgId = organizationRepository.findFirstByNameAndArchivedFalse("SuperApp Master Partner")
                    .map(Organization::getId).orElse(null);

            for (int i = 1; i <= 20; i++) {
                String macId = String.format("00:00:00:00:00:%02X", i);
                if (deviceRepository.findByMacIdAndArchivedFalse(macId).isEmpty()) {
                    Device d = new Device();
                    d.setName("Device " + i);
                    if (masterOrgId != null)
                        d.setOrgId(masterOrgId);
                    d.setMacId(macId);
                    d.setStatus("INACTIVE"); // начинаем с неактивного статуса (по просьбе пользователя)
                    d.setArchived(false);
                    deviceRepository.save(d);
                }
            }
        }
    }

}
