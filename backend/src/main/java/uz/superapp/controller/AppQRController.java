package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    @Operation(summary = "Scan QR code (kioskId or URL) to get branch and mac details")
    @GetMapping("/scan")
    public ResponseEntity<?> scan(@RequestParam String code) {
        String searchCode = code;

        // Handle deep link URLs: uzsuper://kiosk?mac=... or uzsuper1://...
        if (code.contains("?mac=")) {
            searchCode = code.substring(code.indexOf("?mac=") + 5);
        } else if (code.contains("?kioskId=")) {
            searchCode = code.substring(code.indexOf("?kioskId=") + 9);
        }

        // Try find by kioskId first
        var kioskOpt = hardwareKioskRepository.findByKioskIdAndArchivedFalse(searchCode);

        // If not found, try find by macId
        if (kioskOpt.isEmpty()) {
            kioskOpt = hardwareKioskRepository.findByMacIdAndArchivedFalse(searchCode);
        }

        return kioskOpt.map(kiosk -> {
            Map<String, Object> result = new HashMap<>();
            result.put("macId", kiosk.getMacId());
            result.put("branchId", kiosk.getBranchId());
            result.put("kioskId", kiosk.getKioskId());
            result.put("name", kiosk.getName());
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }
}
