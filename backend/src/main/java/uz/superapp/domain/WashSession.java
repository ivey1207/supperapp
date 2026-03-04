package uz.superapp.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Сеанс мойки — создаётся когда пользователь оплачивает через мобильное
 * приложение (QR-скан)
 * Статусы: PENDING → ACTIVE → FINISHED | FAILED
 */
@Entity
@Table(name = "wash_sessions")
public class WashSession {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    private String id;

    /** ID Hardware Kiosk (совпадает с controllerId для heartbeat) */
    /** ID Hardware Kiosk (совпадает с controllerId для heartbeat) */
    private String kioskId;

    /** ID пользователя мобильного приложения */
    private String userId;

    /** ID организации */
    private String orgId;

    /** ID филиала/бокса */
    private String branchId;

    /** Статус: PENDING, ACTIVE, PAUSED, FINISHED, FAILED */
    private String status = "PENDING";

    /** Сумма оплаты */
    private BigDecimal paidAmount;

    /** ID команды в очереди (controllerId + commandId) */
    private String commandId;

    /** Время начала сессии */
    private Instant startedAt;

    /** Время завершения сессии */
    private Instant finishedAt;

    /** Причина завершения или ошибки */
    private String finishReason;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getKioskId() {
        return kioskId;
    }

    public void setKioskId(String kioskId) {
        this.kioskId = kioskId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }

    public String getCommandId() {
        return commandId;
    }

    public void setCommandId(String commandId) {
        this.commandId = commandId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getFinishReason() {
        return finishReason;
    }

    public void setFinishReason(String finishReason) {
        this.finishReason = finishReason;
    }
}
