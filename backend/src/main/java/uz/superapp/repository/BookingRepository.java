package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.Booking;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends MongoRepository<Booking, String> {
    
    List<Booking> findByUserIdAndArchivedFalse(String userId);
    
    List<Booking> findByOrgIdAndArchivedFalse(String orgId);
    
    List<Booking> findByBranchIdAndArchivedFalse(String branchId);
    
    List<Booking> findByServiceIdAndArchivedFalse(String serviceId);
    
    /**
     * Найти все активные бронирования (PENDING, CONFIRMED, IN_PROGRESS) для услуги,
     * отсортированные по времени начала
     */
    List<Booking> findByServiceIdAndStatusInAndArchivedFalseOrderByStartTimeAsc(
            String serviceId, List<String> statuses);
    
    /**
     * Найти бронирования в определённом временном диапазоне
     */
    List<Booking> findByServiceIdAndStartTimeBetweenAndStatusInAndArchivedFalse(
            String serviceId, Instant start, Instant end, List<String> statuses);
    
    /**
     * Найти следующее бронирование в очереди для услуги
     */
    Optional<Booking> findFirstByServiceIdAndStatusAndArchivedFalseOrderByQueuePositionAscCreatedAtAsc(
            String serviceId, String status);
    
    /**
     * Подсчитать количество бронирований в очереди для услуги
     */
    long countByServiceIdAndStatusAndArchivedFalse(String serviceId, String status);
    
    /**
     * Найти все бронирования в очереди для услуги, отсортированные по позиции
     */
    List<Booking> findByServiceIdAndStatusAndArchivedFalseOrderByQueuePositionAscCreatedAtAsc(
            String serviceId, String status);
}
