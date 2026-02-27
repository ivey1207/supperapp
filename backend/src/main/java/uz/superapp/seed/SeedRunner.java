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

    public SeedRunner(AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            OrganizationRepository organizationRepository,
            BranchRepository branchRepository,
            DeviceRepository deviceRepository) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizationRepository = organizationRepository;
        this.branchRepository = branchRepository;
        this.deviceRepository = deviceRepository;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("SeedRunner starting...");
            // Create super admin ONLY if not exists
            if (accountRepository.findByEmail("admin@admin.com").isEmpty()) {
                Account admin = new Account();
                admin.setEmail("admin@admin.com");
                admin.setPasswordHash(passwordEncoder.encode("Admin1!"));
                admin.setFullName("Admin");
                admin.setRole("SUPER_ADMIN");
                accountRepository.save(admin);
                System.out.println("Created super admin: admin@admin.com");
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
