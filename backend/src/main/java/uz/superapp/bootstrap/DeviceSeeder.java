package uz.superapp.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import uz.superapp.domain.Device;
import uz.superapp.repository.DeviceRepository;

import java.time.Instant;
import java.util.Optional;

@Component
public class DeviceSeeder implements CommandLineRunner {

    private final DeviceRepository deviceRepository;

    public DeviceSeeder(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        for (int i = 1; i <= 20; i++) {
            String macId = String.format("00:00:00:00:00:%02X", i);
            Optional<Device> existing = deviceRepository.findByMacIdAndArchivedFalse(macId);
            if (existing.isEmpty()) {
                Device device = new Device();
                device.setMacId(macId);
                device.setName("Test Kiosk " + i);
                device.setStatus("INACTIVE");
                device.setArchived(false);
                device.setRegisteredAt(Instant.now());
                device.setCashBalance(java.math.BigDecimal.ZERO);

                deviceRepository.save(device);
                System.out.println("Seeded device: " + macId);
            }
        }
    }
}
