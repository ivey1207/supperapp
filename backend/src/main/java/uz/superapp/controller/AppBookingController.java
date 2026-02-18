package uz.superapp.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.AppUser;
import uz.superapp.domain.Booking;
import uz.superapp.domain.Service;
import uz.superapp.repository.AppUserRepository;
import uz.superapp.repository.BookingRepository;
import uz.superapp.repository.ServiceRepository;
import uz.superapp.service.BookingQueueService;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/app/bookings")
public class AppBookingController {
    
    private final BookingRepository bookingRepository;
    private final ServiceRepository serviceRepository;
    private final AppUserRepository appUserRepository;
    private final BookingQueueService bookingQueueService;
    
    public AppBookingController(BookingRepository bookingRepository,
                               ServiceRepository serviceRepository,
                               AppUserRepository appUserRepository,
                               BookingQueueService bookingQueueService) {
        this.bookingRepository = bookingRepository;
        this.serviceRepository = serviceRepository;
        this.appUserRepository = appUserRepository;
        this.bookingQueueService = bookingQueueService;
    }
    
    /**
     * Создать бронирование (добавить в очередь)
     * Доступно обычным пользователям мобильного приложения
     */
    @PostMapping
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Optional<AppUser> userOpt = appUserRepository.findById(auth.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AppUser user = userOpt.get();
        
        Object serviceIdObj = body.get("serviceId");
        if (!(serviceIdObj instanceof String) || ((String) serviceIdObj).isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "serviceId is required"));
        }
        String serviceId = (String) serviceIdObj;
        
        Optional<Service> serviceOpt = serviceRepository.findById(serviceId);
        if (serviceOpt.isEmpty() || serviceOpt.get().isArchived() || !serviceOpt.get().isActive()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Service not found or inactive"));
        }
        Service service = serviceOpt.get();
        
        if (!service.isBookable()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Service is not bookable"));
        }
        
        Object startTimeObj = body.get("startTime");
        if (!(startTimeObj instanceof String)) {
            return ResponseEntity.badRequest().body(Map.of("message", "startTime is required (ISO format)"));
        }
        Instant startTime;
        try {
            startTime = Instant.parse((String) startTimeObj);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid startTime format"));
        }
        
        Integer durationMinutes = service.getDurationMinutes() != null ? service.getDurationMinutes() : 30;
        Instant endTime = startTime.plusSeconds(durationMinutes * 60L);
        
        // Проверить, нет ли конфликтующих бронирований
        List<String> activeStatuses = List.of("PENDING", "CONFIRMED", "IN_PROGRESS");
        List<Booking> conflicting = bookingRepository.findByServiceIdAndStartTimeBetweenAndStatusInAndArchivedFalse(
                serviceId, startTime, endTime, activeStatuses);
        if (!conflicting.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Time slot is already booked"));
        }
        
        Booking booking = new Booking();
        booking.setUserId(user.getId());
        booking.setOrgId(service.getOrgId());
        Object branchIdObj = body.get("branchId");
        if (branchIdObj instanceof String) {
            booking.setBranchId((String) branchIdObj);
        }
        booking.setServiceId(serviceId);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setStatus("PENDING");
        
        Object commentObj = body.get("comment");
        if (commentObj instanceof String) {
            booking.setComment((String) commentObj);
        }
        
        Object phoneObj = body.get("phone");
        if (phoneObj instanceof String) {
            booking.setPhone((String) phoneObj);
        } else {
            booking.setPhone(user.getPhone());
        }
        
        Object clientNameObj = body.get("clientName");
        if (clientNameObj instanceof String) {
            booking.setClientName((String) clientNameObj);
        } else {
            booking.setClientName(user.getFullName());
        }
        
        bookingQueueService.addToQueue(booking);
        
        Map<String, Object> response = buildBookingMap(booking);
        response.put("queuePosition", booking.getQueuePosition());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Получить мои бронирования
     * Доступно обычным пользователям мобильного приложения
     */
    @GetMapping
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<List<Map<String, Object>>> myBookings(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<Booking> bookings = bookingRepository.findByUserIdAndArchivedFalse(auth.getName());
        List<Map<String, Object>> result = bookings.stream()
                .map(this::buildBookingMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Получить информацию о бронировании
     * Доступно обычным пользователям мобильного приложения (только свои бронирования)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (!booking.getUserId().equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        Map<String, Object> response = buildBookingMap(booking);
        if ("PENDING".equals(booking.getStatus())) {
            response.put("queuePosition", booking.getQueuePosition());
            long totalInQueue = bookingRepository.countByServiceIdAndStatusAndArchivedFalse(
                    booking.getServiceId(), "PENDING");
            response.put("totalInQueue", totalInQueue);
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Отменить моё бронирование
     * Доступно обычным пользователям мобильного приложения (только свои бронирования)
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable String id, Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (!booking.getUserId().equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        bookingQueueService.cancelBooking(id);
        booking = bookingRepository.findById(id).orElse(booking);
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    /**
     * Получить доступные временные слоты для услуги
     * Доступно обычным пользователям мобильного приложения
     */
    @GetMapping("/available-slots")
    @PreAuthorize("hasRole('APP_USER') or hasRole('USER')")
    public ResponseEntity<List<Map<String, Object>>> getAvailableSlots(
            @RequestParam String serviceId,
            @RequestParam String date, // YYYY-MM-DD
            Authentication auth) {
        
        Optional<Service> serviceOpt = serviceRepository.findById(serviceId);
        if (serviceOpt.isEmpty() || serviceOpt.get().isArchived() || !serviceOpt.get().isActive()) {
            return ResponseEntity.badRequest().body(List.of());
        }
        Service service = serviceOpt.get();
        
        if (!service.isBookable()) {
            return ResponseEntity.badRequest().body(List.of());
        }
        
        Integer intervalMinutes = service.getBookingIntervalMinutes() != null 
                ? service.getBookingIntervalMinutes() : 30;
        Integer durationMinutes = service.getDurationMinutes() != null 
                ? service.getDurationMinutes() : 30;
        
        LocalDateTime dayStart = LocalDateTime.parse(date + "T00:00:00");
        LocalDateTime dayEnd = dayStart.plusDays(1);
        Instant startInstant = dayStart.toInstant(ZoneOffset.UTC);
        Instant endInstant = dayEnd.toInstant(ZoneOffset.UTC);
        
        List<String> activeStatuses = List.of("PENDING", "CONFIRMED", "IN_PROGRESS");
        List<Booking> existingBookings = bookingRepository
                .findByServiceIdAndStartTimeBetweenAndStatusInAndArchivedFalse(
                        serviceId, startInstant, endInstant, activeStatuses);
        
        List<Map<String, Object>> slots = new java.util.ArrayList<>();
        LocalDateTime current = dayStart;
        while (current.isBefore(dayEnd)) {
            Instant slotStart = current.toInstant(ZoneOffset.UTC);
            Instant slotEnd = slotStart.plusSeconds(durationMinutes * 60L);
            
            boolean isAvailable = existingBookings.stream()
                    .noneMatch(b -> {
                        Instant bStart = b.getStartTime();
                        Instant bEnd = b.getEndTime();
                        return (slotStart.isBefore(bEnd) && slotEnd.isAfter(bStart));
                    });
            
            Map<String, Object> slot = new LinkedHashMap<>();
            slot.put("startTime", slotStart.toString());
            slot.put("endTime", slotEnd.toString());
            slot.put("available", isAvailable);
            slots.add(slot);
            
            current = current.plusMinutes(intervalMinutes);
        }
        
        return ResponseEntity.ok(slots);
    }
    
    private Map<String, Object> buildBookingMap(Booking booking) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", booking.getId());
        m.put("userId", booking.getUserId() != null ? booking.getUserId() : "");
        m.put("orgId", booking.getOrgId() != null ? booking.getOrgId() : "");
        m.put("branchId", booking.getBranchId() != null ? booking.getBranchId() : "");
        m.put("serviceId", booking.getServiceId() != null ? booking.getServiceId() : "");
        m.put("startTime", booking.getStartTime() != null ? booking.getStartTime().toString() : null);
        m.put("endTime", booking.getEndTime() != null ? booking.getEndTime().toString() : null);
        m.put("status", booking.getStatus() != null ? booking.getStatus() : "PENDING");
        m.put("queuePosition", booking.getQueuePosition());
        m.put("comment", booking.getComment() != null ? booking.getComment() : "");
        m.put("phone", booking.getPhone() != null ? booking.getPhone() : "");
        m.put("clientName", booking.getClientName() != null ? booking.getClientName() : "");
        m.put("createdAt", booking.getCreatedAt() != null ? booking.getCreatedAt().toString() : null);
        m.put("updatedAt", booking.getUpdatedAt() != null ? booking.getUpdatedAt().toString() : null);
        return m;
    }
}
