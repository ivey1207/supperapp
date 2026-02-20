package uz.superapp.seed;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uz.superapp.domain.*;
import uz.superapp.repository.*;

@Component
public class SeedRunner implements CommandLineRunner {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrganizationRepository organizationRepository;
    private final BranchRepository branchRepository;
    private final DeviceRepository deviceRepository;
    private final HardwareKioskRepository hardwareKioskRepository;
    private final ServiceRepository serviceRepository;
    private final OrderRepository orderRepository;
    private final BookingRepository bookingRepository;

    public SeedRunner(AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            OrganizationRepository organizationRepository,
            BranchRepository branchRepository,
            DeviceRepository deviceRepository,
            HardwareKioskRepository hardwareKioskRepository,
            ServiceRepository serviceRepository,
            OrderRepository orderRepository,
            BookingRepository bookingRepository) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizationRepository = organizationRepository;
        this.branchRepository = branchRepository;
        this.deviceRepository = deviceRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
        this.serviceRepository = serviceRepository;
        this.orderRepository = orderRepository;
        this.bookingRepository = bookingRepository;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("SeedRunner starting...");
            // Create or reset super admin
            accountRepository.findByEmail("admin@admin.com").ifPresentOrElse(
                    admin -> {
                        boolean changed = false;
                        if (!passwordEncoder.matches("Admin1!", admin.getPasswordHash())) {
                            admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                            changed = true;
                        }
                        if (!"SUPER_ADMIN".equals(admin.getRole())) {
                            admin.setRole("SUPER_ADMIN");
                            changed = true;
                        }
                        if (admin.isArchived()) {
                            admin.setArchived(false);
                            changed = true;
                        }
                        if (changed) {
                            accountRepository.save(admin);
                            System.out.println("Updated super admin: admin@admin.com");
                        }
                    },
                    () -> {
                        Account admin = new Account();
                        admin.setEmail("admin@admin.com");
                        admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                        admin.setFullName("Admin");
                        admin.setRole("SUPER_ADMIN");
                        accountRepository.save(admin);
                        System.out.println("Created super admin: admin@admin.com");
                    });

            // 1. CLEAR DATABASE (Keep only Super Admin)
            long totalOrgs = organizationRepository.count();
            if (totalOrgs > 1) { // If more than 1, we reset
                System.out.println("Cleaning database (more than 1 organization found)...");

                organizationRepository.deleteAll();
                branchRepository.deleteAll();
                deviceRepository.deleteAll();
                hardwareKioskRepository.deleteAll();
                serviceRepository.deleteAll();
                orderRepository.deleteAll();
                bookingRepository.deleteAll();

                // Remove all accounts except super admin
                accountRepository.findAll().stream()
                        .filter(a -> !"SUPER_ADMIN".equals(a.getRole()))
                        .forEach(accountRepository::delete);

                System.out.println("Database cleared.");
            }

            // 2. Ensure ONE organization exists
            Organization masterOrg = organizationRepository.findAll().stream().findFirst().orElse(null);
            if (masterOrg == null) {
                System.out.println("Creating default Master Organization...");
                masterOrg = new Organization();
                masterOrg.setName("SuperApp Master Partner");
                masterOrg.setPartnerType("SERVICE");
                masterOrg.setStatus("ACTIVE");
                masterOrg.setAddress("Ташкент, пр. Амира Темура, 1");
                masterOrg.setPhone("+998901234567");
                masterOrg.setEmail("master@superapp.uz");
                masterOrg.setArchived(false);
                organizationRepository.save(masterOrg);

                Branch mainBranch = new Branch();
                mainBranch.setOrgId(masterOrg.getId());
                mainBranch.setName("Главный офис");
                mainBranch.setAddress(masterOrg.getAddress());
                mainBranch.setPartnerType(masterOrg.getPartnerType());
                mainBranch.setStatus("OPEN");
                mainBranch.setArchived(false);
                branchRepository.save(mainBranch);

                System.out.println("Master Organization created.");
            }

            // 3. Seed 15 inactive devices if none exist
            if (deviceRepository.count() < 15) {
                System.out.println("Seeding missing inactive devices...");
                for (int i = 1; i <= 15; i++) {
                    String macId = String.format("00:00:00:00:00:%02X", i);
                    if (deviceRepository.findByMacIdAndArchivedFalse(macId).isEmpty()) {
                        Device d = new Device();
                        d.setName("Device " + i);
                        d.setOrgId(masterOrg.getId());
                        d.setMacId(macId);
                        d.setStatus("INACTIVE");
                        d.setArchived(false);
                        deviceRepository.save(d);
                        System.out.println("Seeded device: " + macId);
                    }
                }
            }

            System.out.println("SeedRunner completed successfully!");
        } catch (Exception e) {
            System.err.println("ERROR IN SEED RUNNER: " + e.getMessage());
            e.printStackTrace();
        }
    }

}
