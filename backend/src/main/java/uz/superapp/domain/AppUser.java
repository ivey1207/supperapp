package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("app_users")
public class AppUser {
    @Id
    private String id;
    @Indexed(unique = true)
    private String phone;
    private String fullName;
    private String walletId;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getWalletId() { return walletId; }
    public void setWalletId(String walletId) { this.walletId = walletId; }
}
