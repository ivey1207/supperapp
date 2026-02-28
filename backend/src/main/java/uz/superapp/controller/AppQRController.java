package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.repository.HardwareKioskRepository;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "App QR API")
@RestController
@RequestMapping("/api/v1/app/qr")
public class AppQRController {

    private final HardwareKioskRepository hardwareKioskRepository;

    public AppQRController(HardwareKioskRepository hardwareKioskRepository) {
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @Operation(summary = "Scan QR code (kioskId) to get branch and mac details")
    @GetMapping("/scan")
    public ResponseEntity<?> scan(@RequestParam String code) {
        return hardwareKioskRepository.findByKioskIdAndArchivedFalse(code)
                .map(kiosk -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("macId", kiosk.getMacId());
                    result.put("branchId", kiosk.getBranchId());
                    result.put("kioskId", kiosk.getKioskId());
                    result.put("name", kiosk.getName());
                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
