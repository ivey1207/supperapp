package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.domain.PaymentTransaction;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.repository.PaymentTransactionRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * API для регистрации платежей от Hardware Kiosk (Raspberry Pi).
 * Вызывается самим устройством после получения оплаты:
 * - CASH: купюроприёмник принял банкноты
 * - RFID: считана RFID-карта
 *
 * POST /api/v1/controller/payment — регистрация платежа от устройства
 */
@Tag(name = "Kiosk Payment API")
@RestController
@RequestMapping("/api/v1/controller")
public class KioskPaymentController {

    private final PaymentTransactionRepository transactionRepository;
    private final HardwareKioskRepository hardwareKioskRepository;

    public KioskPaymentController(PaymentTransactionRepository transactionRepository,
            HardwareKioskRepository hardwareKioskRepository) {
        this.transactionRepository = transactionRepository;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    /**
     * Raspberry Pi сообщает что принята оплата (CASH или RFID).
     *
     * Body:
     * {
     * "macId": "AA:BB:CC:DD:EE:FF",
     * "paymentType": "CASH", // или "RFID"
     * "amount": 10000,
     * "rfidCardId": "...", // только если RFID
     * "description": "Купюра 10000 сум"
     * }
     */
    @Operation(summary = "Execute registerPayment operation")
    @PostMapping("/payment")
    public ResponseEntity<?> registerPayment(@RequestBody Map<String, Object> body) {
        String macId = body.getOrDefault("macId", "").toString().trim().toUpperCase();
        String paymentType = body.getOrDefault("paymentType", "CASH").toString().toUpperCase();
        String amountStr = body.getOrDefault("amount", "0").toString();

        if (macId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "macId is required"));
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(amountStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "invalid amount"));
        }

        // Найти киоск по MAC ID
        HardwareKiosk kiosk = hardwareKioskRepository.findByMacIdAndArchivedFalse(macId)
                .orElse(null);

        PaymentTransaction tx = new PaymentTransaction();
        tx.setPaymentType(paymentType);
        tx.setKioskId(macId);
        tx.setAmount(amount);
        tx.setCurrency("UZS");
        tx.setStatus("SUCCESS");
        tx.setCreatedAt(Instant.now());

        if (kiosk != null) {
            tx.setOrgId(kiosk.getOrgId());
            tx.setBranchId(kiosk.getBranchId());

            // Пополнить баланс киоска
            BigDecimal currentBalance = kiosk.getBalance() != null ? kiosk.getBalance() : BigDecimal.ZERO;
            kiosk.setBalance(currentBalance.add(amount));
            hardwareKioskRepository.save(kiosk);
        }

        if ("RFID".equals(paymentType)) {
            tx.setRfidCardId(body.getOrDefault("rfidCardId", "").toString());
        }

        tx.setDescription(body.getOrDefault("description", paymentType + " payment").toString());

        PaymentTransaction saved = transactionRepository.save(tx);
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "transactionId", saved.getId(),
                "amount", saved.getAmount(),
                "kioskBalance", kiosk != null ? kiosk.getBalance() : 0));
    }
}
