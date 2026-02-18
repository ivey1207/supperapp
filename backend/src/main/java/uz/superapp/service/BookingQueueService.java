package uz.superapp.service;

import org.springframework.stereotype.Service;
import uz.superapp.domain.Booking;
import uz.superapp.repository.BookingRepository;

import java.time.Instant;
import java.util.List;

/**
 * Сервис для управления очередью бронирований
 */
@Service
public class BookingQueueService {
    
    private final BookingRepository bookingRepository;
    
    public BookingQueueService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }
    
    /**
     * Добавить бронирование в очередь и назначить позицию
     */
    public void addToQueue(Booking booking) {
        long queueCount = bookingRepository.countByServiceIdAndStatusAndArchivedFalse(
                booking.getServiceId(), "PENDING");
        booking.setQueuePosition((int) queueCount + 1);
        booking.setStatus("PENDING");
        booking.setCreatedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());
        bookingRepository.save(booking);
    }
    
    /**
     * Получить следующее бронирование из очереди для услуги
     */
    public Booking getNextInQueue(String serviceId) {
        return bookingRepository
                .findFirstByServiceIdAndStatusAndArchivedFalseOrderByQueuePositionAscCreatedAtAsc(
                        serviceId, "PENDING")
                .orElse(null);
    }
    
    /**
     * Подтвердить бронирование (перевести из PENDING в CONFIRMED)
     */
    public void confirmBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && "PENDING".equals(booking.getStatus())) {
            booking.setStatus("CONFIRMED");
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
            // Пересчитать позиции в очереди
            recalculateQueuePositions(booking.getServiceId());
        }
    }
    
    /**
     * Начать выполнение бронирования (CONFIRMED -> IN_PROGRESS)
     */
    public void startBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && "CONFIRMED".equals(booking.getStatus())) {
            booking.setStatus("IN_PROGRESS");
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
        }
    }
    
    /**
     * Завершить бронирование (IN_PROGRESS -> COMPLETED)
     */
    public void completeBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && "IN_PROGRESS".equals(booking.getStatus())) {
            booking.setStatus("COMPLETED");
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
            // Пересчитать позиции в очереди
            recalculateQueuePositions(booking.getServiceId());
        }
    }
    
    /**
     * Отменить бронирование
     */
    public void cancelBooking(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking != null && !"COMPLETED".equals(booking.getStatus())) {
            String serviceId = booking.getServiceId();
            booking.setStatus("CANCELLED");
            booking.setUpdatedAt(Instant.now());
            bookingRepository.save(booking);
            // Пересчитать позиции в очереди
            recalculateQueuePositions(serviceId);
        }
    }
    
    /**
     * Пересчитать позиции в очереди для услуги
     */
    private void recalculateQueuePositions(String serviceId) {
        List<Booking> pendingBookings = bookingRepository
                .findByServiceIdAndStatusAndArchivedFalseOrderByQueuePositionAscCreatedAtAsc(
                        serviceId, "PENDING");
        for (int i = 0; i < pendingBookings.size(); i++) {
            Booking b = pendingBookings.get(i);
            b.setQueuePosition(i + 1);
            b.setUpdatedAt(Instant.now());
        }
        if (!pendingBookings.isEmpty()) {
            bookingRepository.saveAll(pendingBookings);
        }
    }
    
    /**
     * Получить текущую позицию в очереди для бронирования
     */
    public Integer getQueuePosition(String bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null || !"PENDING".equals(booking.getStatus())) {
            return null;
        }
        return booking.getQueuePosition();
    }
}
