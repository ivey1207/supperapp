package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Бронирование услуги или осмотра по времени
 */
@Document("bookings")
public class Booking {
    @Id
    private String id;
    
    /**
     * ID пользователя (AppUser)
     */
    private String userId;
    
    /**
     * ID организации
     */
    private String orgId;
    
    /**
     * ID филиала/локации
     */
    private String branchId;
    
    /**
     * ID услуги
     */
    private String serviceId;
    
    /**
     * Время начала бронирования
     */
    private Instant startTime;
    
    /**
     * Время окончания бронирования
     */
    private Instant endTime;
    
    /**
     * Статус: PENDING (в очереди), CONFIRMED (подтверждено), IN_PROGRESS (выполняется), COMPLETED (завершено), CANCELLED (отменено)
     */
    private String status = "PENDING";
    
    /**
     * Позиция в очереди (для PENDING)
     */
    private Integer queuePosition;
    
    /**
     * Комментарий пользователя
     */
    private String comment;
    
    /**
     * Номер телефона для связи
     */
    private String phone;
    
    /**
     * Имя клиента
     */
    private String clientName;
    
    /**
     * Создано
     */
    private Instant createdAt;
    
    /**
     * Обновлено
     */
    private Instant updatedAt;
    
    /**
     * Мягкое удаление
     */
    private boolean archived;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getOrgId() { return orgId; }
    public void setOrgId(String orgId) { this.orgId = orgId; }
    
    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }
    
    public String getServiceId() { return serviceId; }
    public void setServiceId(String serviceId) { this.serviceId = serviceId; }
    
    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }
    
    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public Integer getQueuePosition() { return queuePosition; }
    public void setQueuePosition(Integer queuePosition) { this.queuePosition = queuePosition; }
    
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
