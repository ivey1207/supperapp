package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.PaymentTransaction;

import java.time.Instant;
import java.util.List;

public interface PaymentTransactionRepository extends MongoRepository<PaymentTransaction, String> {

    /** Все транзакции по типу оплаты */
    List<PaymentTransaction> findByPaymentTypeOrderByCreatedAtDesc(String paymentType);

    /** Транзакции по организации */
    List<PaymentTransaction> findByOrgIdOrderByCreatedAtDesc(String orgId);

    /** Транзакции по киоску */
    List<PaymentTransaction> findByKioskIdOrderByCreatedAtDesc(String kioskId);

    /** За период */
    List<PaymentTransaction> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant from, Instant to);

    /** По типу + организации */
    List<PaymentTransaction> findByPaymentTypeAndOrgIdOrderByCreatedAtDesc(String paymentType, String orgId);

    /** По пользователю */
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(String userId);

    /** Все (для суперадмина) */
    List<PaymentTransaction> findAllByOrderByCreatedAtDesc();
}
