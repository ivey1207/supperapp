package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.Branch;
import uz.superapp.domain.Device;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.repository.AccountRepository;
import uz.superapp.repository.BranchRepository;
import uz.superapp.repository.DeviceRepository;
import uz.superapp.repository.HardwareKioskRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/branches")
public class AdminBranchController {

    private final BranchRepository branchRepository;
    private final AccountRepository accountRepository;
    private final DeviceRepository deviceRepository;
    private final HardwareKioskRepository hardwareKioskRepository;

    public AdminBranchController(BranchRepository branchRepository, AccountRepository accountRepository,
            DeviceRepository deviceRepository, HardwareKioskRepository hardwareKioskRepository) {
        this.branchRepository = branchRepository;
        this.accountRepository = accountRepository;
        this.deviceRepository = deviceRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@RequestParam(required = false) String orgId,
            Authentication auth) {
        String effectiveOrgId = orgId;
        String username = auth != null ? auth.getName() : null;
        if ((effectiveOrgId == null || effectiveOrgId.isBlank()) && username != null) {
            Optional<Account> current = accountRepository.findById(username);
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String partnerOrgId = current.get().getOrgId();
                if (partnerOrgId != null && !partnerOrgId.isBlank()) {
                    effectiveOrgId = partnerOrgId;
                }
            }
        }
        List<Branch> all = effectiveOrgId != null && !effectiveOrgId.isBlank()
                ? branchRepository.findByOrgIdAndArchivedFalse(effectiveOrgId)
                : branchRepository.findByArchivedFalse();
        List<Map<String, Object>> result = all.stream()
                .map(this::buildBranchMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        String orgId = (String) body.get("orgId");
        if (orgId == null || orgId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "orgId is required"));
        }
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(orgId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "name is required"));
        }
        Branch branch = new Branch();
        branch.setOrgId(orgId);
        branch.setName(name);
        branch.setAddress(getString(body, "address", ""));
        branch.setPhone(getString(body, "phone", ""));
        branch.setStatus(getString(body, "status", "OPEN"));
        String partnerType = getString(body, "partnerType", "");
        branch.setPartnerType(partnerType);
        branch.setPhotoUrl(getString(body, "photoUrl", ""));

        Double lat = getDouble(body, "latitude");
        Double lon = getDouble(body, "longitude");
        if (lat != null && lon != null) {
            Branch.GeoLocation loc = new Branch.GeoLocation();
            loc.setCoordinates(List.of(lon, lat)); // GeoJSON format: [longitude, latitude]
            branch.setLocation(loc);
        }

        branch.setArchived(false);
        branchRepository.save(branch);

        // Handle boxCount if provided (automatic assignment of Hardware Kiosks)
        Object boxCountObj = body.get("boxCount");
        if (boxCountObj instanceof Number) {
            int boxCount = ((Number) boxCountObj).intValue();
            if (boxCount > 0) {
                // NEW LOGIC: Find strictly ACTIVE unassigned devices
                List<Device> available = deviceRepository.findByStatusAndBranchIdIsNullAndArchivedFalse("ACTIVE");

                if (available.size() < boxCount) {
                    branchRepository.delete(branch);
                    return ResponseEntity.badRequest()
                            .body(Map.of("message",
                                    "Недостаточно активных свободных устройств (Inventory). Требуется: "
                                            + boxCount + ", доступно: " + available.size()));
                }

                for (int i = 0; i < boxCount; i++) {
                    Device device = available.get(i);
                    device.setOrgId(orgId); // Move to the branch's organization
                    device.setBranchId(branch.getId());
                    device.setName("Box " + (i + 1));
                    device.setStatus("OPEN"); // Transition from ACTIVE to OPEN upon assignment
                    deviceRepository.save(device);

                    // Sync with HardwareKiosk
                    if (device.getMacId() != null) {
                        HardwareKiosk kiosk = hardwareKioskRepository.findByMacIdAndArchivedFalse(device.getMacId())
                                .orElseGet(() -> {
                                    HardwareKiosk newKiosk = new HardwareKiosk();
                                    newKiosk.setMacId(device.getMacId());
                                    newKiosk.setRegisteredAt(java.time.Instant.now());
                                    return newKiosk;
                                });
                        kiosk.setName(device.getName());
                        kiosk.setOrgId(orgId);
                        kiosk.setBranchId(branch.getId());
                        kiosk.setStatus("ACTIVE");
                        kiosk.setArchived(false);
                        hardwareKioskRepository.save(kiosk);
                    }
                }
            }
        }

        return ResponseEntity.ok(buildBranchMap(branch));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        Optional<Branch> branchOpt = branchRepository.findById(id);
        if (branchOpt.isEmpty() || branchOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Branch branch = branchOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branch.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (body.containsKey("name")) {
            branch.setName(getString(body, "name", branch.getName()));
        }
        if (body.containsKey("address")) {
            branch.setAddress(getString(body, "address", ""));
        }
        if (body.containsKey("phone")) {
            branch.setPhone(getString(body, "phone", ""));
        }
        if (body.containsKey("status")) {
            branch.setStatus(getString(body, "status", "OPEN"));
        }
        if (body.containsKey("partnerType")) {
            branch.setPartnerType(getString(body, "partnerType", ""));
        }
        if (body.containsKey("photoUrl")) {
            branch.setPhotoUrl(getString(body, "photoUrl", ""));
        }
        if (body.containsKey("latitude") && body.containsKey("longitude")) {
            Double lat = getDouble(body, "latitude");
            Double lon = getDouble(body, "longitude");
            if (lat != null && lon != null) {
                Branch.GeoLocation loc = new Branch.GeoLocation();
                loc.setCoordinates(List.of(lon, lat));
                branch.setLocation(loc);
            }
        }
        branchRepository.save(branch);
        return ResponseEntity.ok(buildBranchMap(branch));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        System.out.println("DEBUG: AdminBranchController.delete called for id: " + id);
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<Account> current = accountRepository.findById(auth.getName());
        if (current.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String role = current.get().getRole();
        String userOrgId = current.get().getOrgId();
        Optional<Branch> branchOpt = branchRepository.findById(id);
        if (branchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Branch branch = branchOpt.get();
        if (!"SUPER_ADMIN".equals(role) && (userOrgId == null || !userOrgId.equals(branch.getOrgId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        branch.setArchived(true);
        branchRepository.save(branch);
        return ResponseEntity.noContent().build();
    }

    @SuppressWarnings("null")
    private Map<String, Object> buildBranchMap(Branch branch) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", branch.getId());
        m.put("orgId", branch.getOrgId() != null ? branch.getOrgId() : "");
        m.put("name", branch.getName() != null ? branch.getName() : "");
        m.put("address", branch.getAddress() != null ? branch.getAddress() : "");
        m.put("phone", branch.getPhone() != null ? branch.getPhone() : "");
        m.put("status", branch.getStatus() != null ? branch.getStatus() : "OPEN");
        m.put("partnerType", branch.getPartnerType() != null ? branch.getPartnerType() : "");
        m.put("photoUrl", branch.getPhotoUrl() != null ? branch.getPhotoUrl() : "");

        Double lat = null;
        Double lon = null;
        if (branch.getLocation() != null && branch.getLocation().getCoordinates() != null
                && branch.getLocation().getCoordinates().size() >= 2) {
            lon = branch.getLocation().getCoordinates().get(0);
            lat = branch.getLocation().getCoordinates().get(1);
        }
        m.put("latitude", lat);
        m.put("longitude", lon);

        return m;
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object value = map.get(key);
        if (value instanceof String) {
            return (String) value;
        }
        return defaultValue;
    }

    private Double getDouble(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
