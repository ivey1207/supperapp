package uz.superapp.seed;

import org.springframework.beans.factory.annotation.Value;
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

    @Value("${SEED_DATABASE:false}")
    private boolean seedDatabase;

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
            if (!seedDatabase) {
                System.out.println("SeedRunner: SEED_DATABASE is false. Skipping seed processes.");
                return;
            }

            System.out.println("SeedRunner starting...");
            seedSuperAdmin();

            long garageCount = organizationRepository.findAll().stream()
                    .filter(org -> "Garage Group".equals(org.getName()))
                    .count();

            if (garageCount > 1) {
                System.out.println("SeedRunner found duplicate initial data (" + garageCount
                        + "x Garage Group). Wiping to reset.");
                wipeDatabase();
                seedInactiveDevices();
                seedOrganizations();
            } else if (organizationRepository.count() == 0 || branchRepository.count() == 0) {
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

        List<Account> accounts = accountRepository.findAll();
        for (Account acc : accounts) {
            if (!"SUPER_ADMIN".equals(acc.getRole())) {
                accountRepository.delete(acc);
            }
        }

        List<Device> devices = deviceRepository.findAll();
        for (Device d : devices) {
            d.setOrgId(null);
            d.setBranchId(null);
            deviceRepository.save(d);
        }
        System.out.println("Database wiped.");
    }

    private void seedSuperAdmin() {
        boolean forceReset = "true".equalsIgnoreCase(System.getenv("FORCE_RESET_ADMIN"));
        accountRepository.findFirstByEmail("admin@admin.com").ifPresentOrElse(
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
                        admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                        changed = true;
                        if (forceReset) {
                            System.out.println("Force-resetting super admin password to default.");
                        }
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
        createPartnerOrg("Garage Group", "305123456", "CAR_WASH", "garage_group_logo_1772204414116.png",
                "admin@garage.uz", "Tashkent, Chilonzor 15", "+998901234567", "08:00-22:00",
                "A premium car wash network in Tashkent.", 3, "CAR_WASH");

        createPartnerOrg("Lafz", "306987654", "CAR_WASH", "lafz_logo_1772204429157.png",
                "admin@lafz.uz", "Tashkent, Yunusobod 19", "+998909876543", "09:00-21:00",
                "High quality car wash services.", 2, "CAR_WASH");

        createMixedPartnerOrg("Humo Service", "308112233", "humo_service_logo_1772204446649.png",
                "admin@humo.uz", "Tashkent, Mirobod 5", "+998931122334", "00:00-23:59",
                "Reliable auto service and fuel station.");

        createMixedPartnerOrg("Premium Auto", "309554433", "premium_auto_logo_1772204458981.png",
                "admin@premium.uz", "Tashkent, Yakkasaroy 10", "+998945544332", "09:00-20:00",
                "Premium auto services and detailing.");

        createMixedPartnerOrg("Fast Fuel", "310998877", "fast_fuel_logo_1772204475500.png",
                "admin@fastfuel.uz", "Tashkent, Sergeli 2", "+998979988776", "00:00-23:59",
                "Fast and efficient fuel stations.");
    }

    private void createPartnerOrg(String name, String inn, String type, String logo, String email,
            String address, String phone, String workingHours, String desc, int branchCount, String branchType) {

        Organization org = new Organization();
        org.setName(name);
        org.setInn(inn);
        org.setPartnerType(type);
        org.setStatus("ACTIVE");
        org.setLogoUrl("/api/v1/files/" + logo);
        org.setEmail(email);
        org.setAddress(address);
        org.setPhone(phone);
        org.setWorkingHours(workingHours);
        org.setDescription(desc);
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
            b.setAddress(address + ", Sector " + i);
            b.setPhone(phone);
            b.setWorkingHours(workingHours);

            GeoLocation loc = new GeoLocation();
            loc.setCoordinates(Arrays.asList(69.2797 + (i * 0.01), 41.2995 + (i * 0.01)));
            b.setLocation(loc);

            b.setArchived(false);
            branchRepository.save(b);

            seedServicesForBranch(org.getId(), b.getId());

            int kioskCount = 2;
            if ("Garage Group".equals(name) || "Lafz".equals(name)) {
                kioskCount = i;
            }
            assignExistingDevicesForBranch(org.getId(), b.getId(), kioskCount);
        }
        System.out.println("Seeded Organization: " + name);
    }

    private void createMixedPartnerOrg(String name, String inn, String logo, String email,
            String address, String phone, String workingHours, String desc) {

        Organization org = new Organization();
        org.setName(name);
        org.setInn(inn);
        org.setPartnerType("SERVICE");
        org.setStatus("ACTIVE");
        org.setLogoUrl("/api/v1/files/" + logo);
        org.setEmail(email);
        org.setAddress(address);
        org.setPhone(phone);
        org.setWorkingHours(workingHours);
        org.setDescription(desc);
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
        b1.setAddress(address + " (Service)");
        b1.setPhone(phone);
        b1.setWorkingHours(workingHours);

        GeoLocation loc1 = new GeoLocation();
        loc1.setCoordinates(Arrays.asList(69.28, 41.30));
        b1.setLocation(loc1);

        b1.setArchived(false);
        branchRepository.save(b1);

        seedServicesForBranch(org.getId(), b1.getId());
        assignExistingDevicesForBranch(org.getId(), b1.getId(), 2);

        // Branch 2: GAS Station
        Branch b2 = new Branch();
        b2.setOrgId(org.getId());
        b2.setName(name + " Gas Station");
        b2.setStatus("OPEN");
        b2.setPartnerType("GAS_STATION");
        b2.setPhotoUrl("/api/v1/files/gas_station_photo_1772204527404.png");
        b2.setAddress(address + " (Gas Station)");
        b2.setPhone(phone);
        b2.setWorkingHours(workingHours);

        GeoLocation loc2 = new GeoLocation();
        loc2.setCoordinates(Arrays.asList(69.29, 41.31));
        b2.setLocation(loc2);

        b2.setArchived(false);
        branchRepository.save(b2);

        assignExistingDevicesForBranch(org.getId(), b2.getId(), 2);

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

            HardwareKiosk kiosk = new HardwareKiosk();
            kiosk.setName("Kiosk " + (assigned + 1) + " for branch " + branchId);
            kiosk.setKioskId("KIOSK-" + d.getMacId().replace(":", "").substring(6)); // последняя часть MAC
            kiosk.setMacId(d.getMacId()); // ТОТ ЖЕ MAC
            kiosk.setOrgId(orgId);
            kiosk.setBranchId(branchId);
            kiosk.setStatus("ACTIVE");
            kiosk.setArchived(false);
            hardwareKioskRepository.save(kiosk);

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
        if (deviceRepository.count() < 15) {
            String masterOrgId = organizationRepository.findFirstByNameAndArchivedFalse("SuperApp Master Partner")
                    .map(Organization::getId).orElse(null);

            for (int i = 1; i <= 15; i++) {
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
