package uz.superapp.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Hardware киоск - физическое устройство с MAC ID
 */
@Entity
@Table(name = "hardware_kiosks")
public class HardwareKiosk {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String macId;

    @Column(unique = true)
    private String kioskId;

    @Column(precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    private String name;
    private String status = "REGISTERED";
    private String orgId;
    private String branchId;
    private Instant registeredAt;
    private Instant lastHeartbeat;
    private boolean archived;

    @ElementCollection
    @CollectionTable(name = "kiosk_iot_overrides", joinColumns = @JoinColumn(name = "kiosk_id"))
    @MapKeyColumn(name = "service_id")
    private Map<String, KioskServiceIotConfig> iotOverrides = new HashMap<>();

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

    public Map<String, KioskServiceIotConfig> getIotOverrides() {
        return iotOverrides;
    }

    public void setIotOverrides(Map<String, KioskServiceIotConfig> iotOverrides) {
        this.iotOverrides = iotOverrides;
    }
}
