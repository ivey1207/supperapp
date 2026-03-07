package uz.superapp.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "on_demand_orders")
public class OnDemandOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId;
    private String orgId; // Assigned Organization ID
    private String providerId; // Branch ID
    private String type; // MOBILE_WASH, EMERGENCY_SERVICE
    private String status = "PENDING"; // PENDING, ACCEPTED, EN_ROUTE, COMPLETED, CANCELLED

    private String userAddress;
    private double userLat;
    private double userLon;

    private String carDetails;
    private String description;
    private String contractorId; // Specialist/Washer ID
    private Double providerLat;
    private Double providerLon;
    private Instant createdAt = Instant.now();
    private Instant acceptedAt;
    private Instant completedAt;

    @Version
    private Long version;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getUserAddress() {
        return userAddress;
    }

    public void setUserAddress(String userAddress) {
        this.userAddress = userAddress;
    }

    public double getUserLat() {
        return userLat;
    }

    public void setUserLat(double userLat) {
        this.userLat = userLat;
    }

    public double getUserLon() {
        return userLon;
    }

    public void setUserLon(double userLon) {
        this.userLon = userLon;
    }

    public String getCarDetails() {
        return carDetails;
    }

    public void setCarDetails(String carDetails) {
        this.carDetails = carDetails;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getProviderLat() {
        return providerLat;
    }

    public void setProviderLat(Double providerLat) {
        this.providerLat = providerLat;
    }

    public Double getProviderLon() {
        return providerLon;
    }

    public void setProviderLon(Double providerLon) {
        this.providerLon = providerLon;
    }

    public String getContractorId() {
        return contractorId;
    }

    public void setContractorId(String contractorId) {
        this.contractorId = contractorId;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(Instant acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}
