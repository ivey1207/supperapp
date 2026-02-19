package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Организация-партнёр (автомойка, АЗС, сервис и т.д.)
 */
@Document("organizations")
public class Organization {
    @Id
    private String id;

    /**
     * Название организации
     */
    private String name;

    /**
     * ИНН организации
     */
    private String inn;

    /**
     * Тип партнёра: CAR_WASH (автомойка), GAS_STATION (АЗС), SERVICE (сервис)
     */
    private String partnerType;

    /**
     * Статус: ACTIVE, INACTIVE, SUSPENDED
     */
    private String status = "ACTIVE";

    /**
     * Описание организации
     */
    private String description;

    /**
     * Адрес организации
     */
    private String address;

    /**
     * Телефон для связи
     */
    private String phone;

    /**
     * Email для связи
     */
    private String email;

    /**
     * Время работы (например: "09:00-21:00")
     */
    private String workingHours;

    /**
     * Рейтинг (0-5)
     */
    private Double rating;

    /**
     * Количество отзывов
     */
    private Integer reviewCount;

    /**
     * Логотип/фото (URL)
     */
    private String logoUrl;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getInn() {
        return inn;
    }

    public void setInn(String inn) {
        this.inn = inn;
    }

    public String getPartnerType() {
        return partnerType;
    }

    public void setPartnerType(String partnerType) {
        this.partnerType = partnerType;
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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(Integer reviewCount) {
        this.reviewCount = reviewCount;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }
}
