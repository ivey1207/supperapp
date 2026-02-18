package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Document("orders")
public class Order {
    @Id
    private String id;
    private String userId;
    private String branchId;
    private String status;
    private BigDecimal totalAmount;
    private String currency = "UZS";
    private Instant createdAt;
    private List<OrderLine> lines;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public List<OrderLine> getLines() { return lines; }
    public void setLines(List<OrderLine> lines) { this.lines = lines; }

    public static class OrderLine {
        private String title;
        private int quantity;
        private BigDecimal lineTotal;
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public BigDecimal getLineTotal() { return lineTotal; }
        public void setLineTotal(BigDecimal lineTotal) { this.lineTotal = lineTotal; }
    }
}
