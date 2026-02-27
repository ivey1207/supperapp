package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Hardware киоск - физическое устройство с MAC ID
 */
@Document("hardware_kiosks")
public class HardwareKiosk {
    @Id
    private String id;

    /**
     * MAC адрес устройства (уникальный идентификатор)
     */
    @Indexed(unique = true)
    private String macId;

    /**
     * Уникальный ID киоска для QR-кода (совпадает с controllerId для heartbeat).
     * Формат: KIOSK_001, KIOSK_002 и т.д. Печатается на наклейке QR.
     */
    @Indexed(unique = true, sparse = true)
    private String kioskId;

    /**
     * Баланс киоска (пополняется через мобильное приложение после QR-скана)
     */
    private BigDecimal balance = BigDecimal.ZERO;

    /**
     * Название устройства (опционально)
     */
    private String name;

    /**
     * Статус: REGISTERED (зарегистрирован, но не привязан), ACTIVE (привязан к
     * организации), INACTIVE (неактивен)
     */
    private String status = "REGISTERED";

    /**
     * ID организации, к которой привязан киоск (null если не привязан)
     */
    private String orgId;

    /**
     * ID филиала/локации, к которой привязан киоск (null если не привязан)
     */
    private String branchId;

    /**
     * Время регистрации устройства
     */
    private Instant registeredAt;

    /**
     * Время последнего heartbeat
     */
    private Instant lastHeartbeat;

    /**
     * Мягкое удаление
     */
    private boolean archived;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMacId() {
        return macId;
    }

    public void setMacId(String macId) {
        this.macId = macId;
    }

    public String getKioskId() {
        return kioskId;
    }

    public void setKioskId(String kioskId) {
        this.kioskId = kioskId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public Instant getRegisteredAt() {
        return registeredAt;
    }

    public void setRegisteredAt(Instant registeredAt) {
        this.registeredAt = registeredAt;
    }

    public Instant getLastHeartbeat() {
        return lastHeartbeat;
    }

    public void setLastHeartbeat(Instant lastHeartbeat) {
        this.lastHeartbeat = lastHeartbeat;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
