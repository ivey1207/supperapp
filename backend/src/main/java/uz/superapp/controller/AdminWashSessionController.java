package uz.superapp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.WashSession;
import uz.superapp.repository.WashSessionRepository;
import uz.superapp.service.WashSessionService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin API для мониторинга сеансов мойки.
 */
@RestController
@RequestMapping("/api/v1/admin/wash-sessions")
public class AdminWashSessionController {

    private final WashSessionRepository washSessionRepository;
    private final WashSessionService washSessionService;

    public AdminWashSessionController(WashSessionRepository washSessionRepository,
            WashSessionService washSessionService) {
        this.washSessionRepository = washSessionRepository;
        this.washSessionService = washSessionService;
    }

    /**
     * Список сессий с фильтром по статусу и/или kioskId.
     */
    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String status,
            @RequestParam(required = false) String kioskId) {
        List<WashSession> sessions;
        if (kioskId != null && !kioskId.isBlank()) {
            sessions = washSessionRepository.findByKioskIdOrderByStartedAtDesc(kioskId);
        } else if (status != null && !status.isBlank()) {
            sessions = washSessionRepository.findByStatusOrderByStartedAtDesc(status);
        } else {
            sessions = washSessionRepository.findByStatusOrderByStartedAtDesc("ACTIVE");
        }

        List<Map<String, Object>> result = sessions.stream()
                .map(this::sessionToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Принудительно остановить сессию из админки.
     */
    @PostMapping("/{sessionId}/stop")
    public ResponseEntity<?> forceStop(@PathVariable String sessionId) {
        try {
            WashSession session = washSessionService.stopSession(sessionId, "admin_stop");
            return ResponseEntity.ok(sessionToMap(session));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private Map<String, Object> sessionToMap(WashSession s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("kioskId", s.getKioskId());
        m.put("userId", s.getUserId());
        m.put("orgId", s.getOrgId());
        m.put("branchId", s.getBranchId());
        m.put("status", s.getStatus());
        m.put("paidAmount", s.getPaidAmount());
        m.put("commandId", s.getCommandId());
        m.put("startedAt", s.getStartedAt() != null ? s.getStartedAt().toString() : null);
        m.put("finishedAt", s.getFinishedAt() != null ? s.getFinishedAt().toString() : null);
        m.put("finishReason", s.getFinishReason());
        return m;
    }
}
