package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Device;
import uz.superapp.repository.DeviceRepository;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Контроллер для регистрации hardware устройств (киосков)
 * Когда устройство отправляет свой MAC ID, оно автоматически регистрируется
 */
@RestController
@RequestMapping("/api/v1/hardware")
public class HardwareRegistrationController {

    private final DeviceRepository deviceRepository;

    public HardwareRegistrationController(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    /**
     * Регистрация hardware устройства по MAC ID
     * Вызывается самим устройством при первом подключении
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body) {
        Object macIdObj = body.get("macId");
        if (!(macIdObj instanceof String) || ((String) macIdObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "macId is required"));
        }
        String macId = ((String) macIdObj).trim().toUpperCase();

        // Проверить, не зарегистрировано ли уже устройство
        Optional<Device> existingOpt = deviceRepository.findByMacIdAndArchivedFalse(macId);
        Device device;

        if (existingOpt.isPresent()) {
            device = existingOpt.get();
            // Обновить последний heartbeat
            device.setLastHeartbeat(Instant.now());
        } else {
            // Создать новое устройство
            device = new Device();
            device.setMacId(macId);
            device.setName("Device " + macId.substring(Math.max(0, macId.length() - 6)));
            device.setStatus("INACTIVE");
            device.setRegisteredAt(Instant.now());
            device.setLastHeartbeat(Instant.now());
            device.setArchived(false);
        }

        deviceRepository.save(device);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", device.getId());
        response.put("macId", device.getMacId());
        response.put("status", device.getStatus());
        response.put("registered", existingOpt.isEmpty());

        return ResponseEntity.ok(response);
    }

    /**
     * Heartbeat от hardware устройства
     */
    @PostMapping("/heartbeat/{macId}")
    public ResponseEntity<Map<String, Object>> heartbeat(@PathVariable String macId) {
        String normalizedMacId = macId.trim().toUpperCase();
        Optional<Device> deviceOpt = deviceRepository.findByMacIdAndArchivedFalse(normalizedMacId);

        if (deviceOpt.isEmpty()) {
            // Если устройство не зарегистрировано, зарегистрировать его
            Device device = new Device();
            device.setMacId(normalizedMacId);
            device.setName("Device " + normalizedMacId.substring(Math.max(0, normalizedMacId.length() - 6)));
            device.setStatus("INACTIVE");
            device.setRegisteredAt(Instant.now());
            device.setLastHeartbeat(Instant.now());
            device.setArchived(false);
            deviceRepository.save(device);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("status", "registered");
            response.put("macId", normalizedMacId);
            return ResponseEntity.ok(response);
        }

        Device device = deviceOpt.get();
        device.setLastHeartbeat(Instant.now());
        deviceRepository.save(device);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("macId", normalizedMacId);
        response.put("orgId", device.getOrgId());
        response.put("branchId", device.getBranchId());

        return ResponseEntity.ok(response);
    }
}
