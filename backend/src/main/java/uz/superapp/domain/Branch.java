package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document("branches")
public class Branch {
    @Id
    private String id;
    private String orgId;
    private String name;
    private String address;
    private String phone;
    private String status = "OPEN";
    private String partnerType;
    private GeoLocation location;
    private String workingHours;
    private List<String> images;
    private String photoUrl;
    private boolean archived;

    // Smart Filter Properties
    private boolean is24x7 = false;
    private boolean hasCafe = false;
    private boolean hasInAppPayment = false;
    private double rating = 0.0;
    private int reviewCount = 0;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPartnerType() {
        return partnerType;
    }

    public void setPartnerType(String partnerType) {
        this.partnerType = partnerType;
    }

    public GeoLocation getLocation() {
        return location;
    }

    public void setLocation(GeoLocation location) {
        this.location = location;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public boolean isIs24x7() {
        return is24x7;
    }

    public void setIs24x7(boolean is24x7) {
        this.is24x7 = is24x7;
    }

    public boolean isHasCafe() {
        return hasCafe;
    }

    public void setHasCafe(boolean hasCafe) {
        this.hasCafe = hasCafe;
    }

    public boolean isHasInAppPayment() {
        return hasInAppPayment;
    }

    public void setHasInAppPayment(boolean hasInAppPayment) {
        this.hasInAppPayment = hasInAppPayment;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public int getReviewCount() {
        return reviewCount;
    }

    public void setReviewCount(int reviewCount) {
        this.reviewCount = reviewCount;
    }

    public static class GeoLocation {
        private String type = "Point";
        private List<Double> coordinates;

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public List<Double> getCoordinates() {
            return coordinates;
        }

        public void setCoordinates(List<Double> coordinates) {
            this.coordinates = coordinates;
        }
    }
}
