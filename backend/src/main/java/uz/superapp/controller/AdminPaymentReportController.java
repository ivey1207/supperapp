package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.PaymentTransaction;
import uz.superapp.repository.PaymentTransactionRepository;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin API для отчётов по оплатам.
 * Поддерживает три типа: CASH (купюроприёмник), RFID (карта), ONLINE (мобильное
 * приложение).
 *
 * GET /api/v1/admin/payments — все транзакции (с фильтрами)
 * GET /api/v1/admin/payments/summary — сводка по типам и суммам
 * POST /api/v1/admin/payments — регистрация CASH/RFID платежа от киоска
 */
@Tag(name = "Admin Payment Report API")
@RestController
@RequestMapping("/api/v1/admin/payments")
public class AdminPaymentReportController {

    private final PaymentTransactionRepository transactionRepository;

    public AdminPaymentReportController(PaymentTransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    /**
     * Список транзакций с фильтрами:
     * ?type=CASH|RFID|ONLINE
     * ?orgId=...
     * ?kioskId=... (MAC ID)
     * ?date=2026-02-27 (фильтр по дате)
     */
    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String kioskId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<PaymentTransaction> all;

        if (type != null && !type.isBlank() && orgId != null && !orgId.isBlank()) {
            all = transactionRepository.findByPaymentTypeAndOrgIdOrderByCreatedAtDesc(type.toUpperCase(), orgId);
        } else if (type != null && !type.isBlank()) {
            all = transactionRepository.findByPaymentTypeOrderByCreatedAtDesc(type.toUpperCase());
        } else if (orgId != null && !orgId.isBlank()) {
            all = transactionRepository.findByOrgIdOrderByCreatedAtDesc(orgId);
        } else if (kioskId != null && !kioskId.isBlank()) {
            all = transactionRepository.findByKioskIdOrderByCreatedAtDesc(kioskId);
        } else {
            all = transactionRepository.findAllByOrderByCreatedAtDesc();
        }

        // Фильтр по дате
        if (date != null) {
            Instant from = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant to = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            all = all.stream()
                    .filter(t -> t.getCreatedAt() != null
                            && !t.getCreatedAt().isBefore(from)
                            && t.getCreatedAt().isBefore(to))
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> result = all.stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Сводный отчёт — итоговые суммы по каждому типу оплаты.
     * Возвращает: { CASH: {count: 5, total: 250000}, RFID: {...}, ONLINE: {...},
     * total: {...} }
     */
    @Operation(summary = "Execute summary operation")
    @GetMapping("/summary")
    public ResponseEntity<?> summary(
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String kioskId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<PaymentTransaction> all;
        if (orgId != null && !orgId.isBlank()) {
            all = transactionRepository.findByOrgIdOrderByCreatedAtDesc(orgId);
        } else if (kioskId != null && !kioskId.isBlank()) {
            all = transactionRepository.findByKioskIdOrderByCreatedAtDesc(kioskId);
        } else {
            all = transactionRepository.findAllByOrderByCreatedAtDesc();
        }

        // Фильтр по дате
        if (date != null) {
            Instant from = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant to = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            all = all.stream()
                    .filter(t -> t.getCreatedAt() != null
                            && !t.getCreatedAt().isBefore(from)
                            && t.getCreatedAt().isBefore(to))
                    .collect(Collectors.toList());
        }

        // Считаем только SUCCESS
        List<PaymentTransaction> success = all.stream()
                .filter(t -> "SUCCESS".equals(t.getStatus()))
                .collect(Collectors.toList());

        Map<String, Object> summary = new LinkedHashMap<>();
        for (String type : List.of("CASH", "RFID", "ONLINE")) {
            List<PaymentTransaction> byType = success.stream()
                    .filter(t -> type.equals(t.getPaymentType()))
                    .collect(Collectors.toList());
            BigDecimal total = byType.stream()
                    .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> typeStats = new LinkedHashMap<>();
            typeStats.put("count", byType.size());
            typeStats.put("total", total);
            summary.put(type, typeStats);
        }

        BigDecimal grandTotal = success.stream()
                .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        summary.put("ALL", Map.of("count", success.size(), "total", grandTotal));

        return ResponseEntity.ok(summary);
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(PaymentTransaction t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", t.getId());
        m.put("paymentType", t.getPaymentType());
        m.put("kioskId", t.getKioskId());
        m.put("orgId", t.getOrgId());
        m.put("branchId", t.getBranchId());
        m.put("userId", t.getUserId());
        m.put("rfidCardId", t.getRfidCardId());
        m.put("washSessionId", t.getWashSessionId());
        m.put("amount", t.getAmount());
        m.put("currency", t.getCurrency());
        m.put("status", t.getStatus());
        m.put("description", t.getDescription());
        m.put("createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
        return m;
    }
}
