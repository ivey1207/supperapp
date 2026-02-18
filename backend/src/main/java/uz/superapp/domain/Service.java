package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Услуга (для автомоек, АЗС, сервисов)
 */
@Document("services")
public class Service {
    @Id
    private String id;

    /**
     * ID организации-владельца
     */
    private String orgId;

    /**
     * ID филиала (необязательно)
     */
    private String branchId;

    /**
     * Название услуги
     */
    private String name;

    /**
     * Описание услуги
     */
    private String description;

    /**
     * Категория услуги (например: "Мойка", "Осмотр", "Ремонт")
     */
    private String category;

    /**
     * Цена за минуту (в сумах)
     */
    private Integer pricePerMinute;

    /**
     * Длительность услуги в минутах
     */
    private Integer durationMinutes;

    /**
     * Можно ли бронировать по времени
     */
    private boolean bookable = false;

    /**
     * Интервал бронирования в минутах (например, 30 = можно бронировать каждые 30
     * минут)
     */
    private Integer bookingIntervalMinutes = 30;

    /**
     * Время работы услуги (например: "09:00-21:00")
     */
    private String workingHours;

    /**
     * Команда для оборудования (для автомоек)
     */
    private String command;

    /**
     * Relay bits (для автомоек)
     */
    private String relayBits;

    /**
     * Частота мотора (для автомоек)
     */
    private Integer motorFrequency;

    /**
     * Мощность насосов (для автомоек)
     */
    private Integer pump1Power;
    private Integer pump2Power;
    private Integer pump3Power;
    private Integer pump4Power;

    /**
     * Флаг мотора (для автомоек)
     */
    private String motorFlag;

    /**
     * Активна ли услуга
     */
    private boolean active = true;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Integer getPricePerMinute() {
        return pricePerMinute;
    }

    public void setPricePerMinute(Integer pricePerMinute) {
        this.pricePerMinute = pricePerMinute;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public boolean isBookable() {
        return bookable;
    }

    public void setBookable(boolean bookable) {
        this.bookable = bookable;
    }

    public Integer getBookingIntervalMinutes() {
        return bookingIntervalMinutes;
    }

    public void setBookingIntervalMinutes(Integer bookingIntervalMinutes) {
        this.bookingIntervalMinutes = bookingIntervalMinutes;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public String getCommand() {
        return command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getRelayBits() {
        return relayBits;
    }

    public void setRelayBits(String relayBits) {
        this.relayBits = relayBits;
    }

    public Integer getMotorFrequency() {
        return motorFrequency;
    }

    public void setMotorFrequency(Integer motorFrequency) {
        this.motorFrequency = motorFrequency;
    }

    public Integer getPump1Power() {
        return pump1Power;
    }

    public void setPump1Power(Integer pump1Power) {
        this.pump1Power = pump1Power;
    }

    public Integer getPump2Power() {
        return pump2Power;
    }

    public void setPump2Power(Integer pump2Power) {
        this.pump2Power = pump2Power;
    }

    public Integer getPump3Power() {
        return pump3Power;
    }

    public void setPump3Power(Integer pump3Power) {
        this.pump3Power = pump3Power;
    }

    public Integer getPump4Power() {
        return pump4Power;
    }

    public void setPump4Power(Integer pump4Power) {
        this.pump4Power = pump4Power;
    }

    public String getMotorFlag() {
        return motorFlag;
    }

    public void setMotorFlag(String motorFlag) {
        this.motorFlag = motorFlag;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
