package uz.superapp.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

import java.math.BigDecimal;

@Entity
@Table(name = "wallets")
public class Wallet {
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    private String id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AppUser user;

    @Column(precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    private String currency = "UZS";

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
