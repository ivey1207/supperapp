package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.domain.KioskServiceIotConfig;
import uz.superapp.domain.Service;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.repository.ServiceRepository;
import java.util.Optional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "App Service API")
@RestController
@RequestMapping("/api/v1/app/services")
public class AppServiceController {

    private final ServiceRepository serviceRepository;
    private final HardwareKioskRepository hardwareKioskRepository;

    public AppServiceController(ServiceRepository serviceRepository, HardwareKioskRepository hardwareKioskRepository) {
        this.serviceRepository = serviceRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam String branchId,
            @RequestParam(required = false) String macId) {
        List<Service> services = serviceRepository.findByBranchIdAndArchivedFalse(branchId);

        Optional<HardwareKiosk> kioskOpt = Optional.empty();
        if (macId != null && !macId.isBlank()) {
            kioskOpt = hardwareKioskRepository.findByMacIdAndArchivedFalse(macId);
        }

        final Optional<HardwareKiosk> finalKioskOpt = kioskOpt;

        List<Map<String, Object>> result = services.stream()
                .filter(Service::isActive)
                .map(s -> toMapWithOverrides(s, finalKioskOpt.orElse(null)))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toMapWithOverrides(Service s, HardwareKiosk kiosk) {
        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("description", s.getDescription() != null ? s.getDescription() : "");
        m.put("category", s.getCategory() != null ? s.getCategory() : "");
        m.put("pricePerMinute", s.getPricePerMinute() != null ? s.getPricePerMinute() : 0);
        m.put("durationMinutes", s.getDurationMinutes() != null ? s.getDurationMinutes() : 0);
        m.put("bookable", s.isBookable());
        m.put("workingHours", s.getWorkingHours() != null ? s.getWorkingHours() : "");

        // Base IoT configs from Service
        m.put("command", s.getCommand() != null ? s.getCommand() : "");
        m.put("relayBits", s.getRelayBits() != null ? s.getRelayBits() : "");
        m.put("motorFrequency", s.getMotorFrequency() != null ? s.getMotorFrequency() : 0);
        m.put("motorFlag", s.getMotorFlag() != null ? s.getMotorFlag() : "");
        m.put("pump1Power", s.getPump1Power() != null ? s.getPump1Power() : 0);
        m.put("pump2Power", s.getPump2Power() != null ? s.getPump2Power() : 0);
        m.put("pump3Power", s.getPump3Power() != null ? s.getPump3Power() : 0);
        m.put("pump4Power", s.getPump4Power() != null ? s.getPump4Power() : 0);

        // Apply overrides if any
        if (kiosk != null && kiosk.getIotOverrides() != null && kiosk.getIotOverrides().containsKey(s.getId())) {
            KioskServiceIotConfig override = kiosk.getIotOverrides().get(s.getId());
            if (override.getRelayBits() != null)
                m.put("relayBits", override.getRelayBits());
            if (override.getMotorFrequency() != null)
                m.put("motorFrequency", override.getMotorFrequency());
            if (override.getMotorFlag() != null)
                m.put("motorFlag", override.getMotorFlag());
            if (override.getPump1Power() != null)
                m.put("pump1Power", override.getPump1Power());
            if (override.getPump2Power() != null)
                m.put("pump2Power", override.getPump2Power());
            if (override.getPump3Power() != null)
                m.put("pump3Power", override.getPump3Power());
            if (override.getPump4Power() != null)
                m.put("pump4Power", override.getPump4Power());
        }

        return m;
    }
}
