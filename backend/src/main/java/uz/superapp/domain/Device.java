package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Document("devices")
public class Device {

    @Id
    private String id;

    /**
     * Организация-владелец девайса.
     * Не ограничиваем количество девайсов на организацию.
     */
    private String orgId;

    /**
     * Локация / филиал, к которому привязан девайс.
     * ВАЖНО: одна локация может иметь 0..N девайсов (улучшенная логика,
     * в отличие от старого проекта, где фактически подразумевался 1 девайс на
     * локацию).
     */
    private String branchId;

    private String name;

    /**
     * Текущий наличный баланс в девайсе (для отчётов / контроля).
     */
    private BigDecimal cashBalance = BigDecimal.ZERO;

    /**
     * Статус девайса: например, OPEN / CLOSED / MAINTENANCE.
     */
    private String status = "ACTIVE";

    /**
     * MAC адрес устройства (для Hardware Kiosks).
     */
    private String macId;

    /**
     * Время последней активности (Heartbeat).
     */
    private java.time.Instant lastHeartbeat;

    private java.time.Instant registeredAt;

    private String ipAddress;
    private String version;

    /**
     * Мягкое удаление.
     */
    private boolean archived;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getCashBalance() {
        return cashBalance;
    }

    public void setCashBalance(BigDecimal cashBalance) {
        this.cashBalance = cashBalance;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public String getMacId() {
        return macId;
    }

    public void setMacId(String macId) {
        this.macId = macId;
    }

    public java.time.Instant getLastHeartbeat() {
        return lastHeartbeat;
    }

    public void setLastHeartbeat(java.time.Instant lastHeartbeat) {
        this.lastHeartbeat = lastHeartbeat;
    }

    public java.time.Instant getRegisteredAt() {
        return registeredAt;
    }

    public void setRegisteredAt(java.time.Instant registeredAt) {
        this.registeredAt = registeredAt;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}
