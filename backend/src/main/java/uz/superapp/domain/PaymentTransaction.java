package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Транзакция оплаты — фиксирует каждый платёж независимо от его источника.
 *
 * Источники (paymentType):
 * - CASH : купюроприёмник (Cash Validator) на киоске
 * - RFID : RFID-карта клиента
 * - ONLINE : онлайн оплата через мобильное приложение (QR → пополнение)
 *
 * Статусы (status): PENDING, SUCCESS, FAILED, REFUNDED
 */
@Document("payment_transactions")
public class PaymentTransaction {

    @Id
    private String id;

    /** Тип оплаты: CASH | RFID | ONLINE */
    @Indexed
    private String paymentType;

    /** ID киоска (MAC ID Raspberry Pi) */
    @Indexed
    private String kioskId;

    /** ID организации */
    @Indexed
    private String orgId;

    /** ID филиала */
    @Indexed
    private String branchId;

    /** ID пользователя (для ONLINE оплаты) */
    private String userId;

    /** ID RFID карты (для RFID оплаты) */
    private String rfidCardId;

    /** ID сеанса мойки */
    private String washSessionId;

    /** Сумма */
    private BigDecimal amount;

    /** Валюта */
    private String currency = "UZS";

    /** Статус: PENDING, SUCCESS, FAILED, REFUNDED */
    private String status = "SUCCESS";

    /** Описание/примечание */
    private String description;

    /** Время транзакции */
    @Indexed
    private Instant createdAt;

    // ── Getters & Setters ──────────────────────────────────────────────────

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPaymentType() {
        return paymentType;
    }

    public void setPaymentType(String paymentType) {
        this.paymentType = paymentType;
    }

    public String getKioskId() {
        return kioskId;
    }

    public void setKioskId(String kioskId) {
        this.kioskId = kioskId;
    }

    public String getOrgId() {
        return orgId;
    }

    public void setOrgId(String orgId) {
        this.orgId = orgId;
    }

    public String getBranchId() {
        return branchId;
    }

    public void setBranchId(String branchId) {
        this.branchId = branchId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRfidCardId() {
        return rfidCardId;
    }

    public void setRfidCardId(String rfidCardId) {
        this.rfidCardId = rfidCardId;
    }

    public String getWashSessionId() {
        return washSessionId;
    }

    public void setWashSessionId(String washSessionId) {
        this.washSessionId = washSessionId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
