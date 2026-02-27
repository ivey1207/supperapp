package uz.superapp.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.Account;
import uz.superapp.domain.Booking;
import uz.superapp.domain.Service;
import uz.superapp.repository.AccountRepository;
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

@Tag(name = "Admin Booking API")
@RestController
@RequestMapping("/api/v1/admin/bookings")
public class AdminBookingController {
    
    private final BookingRepository bookingRepository;
    private final ServiceRepository serviceRepository;
    private final AccountRepository accountRepository;
    private final BookingQueueService bookingQueueService;
    
    public AdminBookingController(BookingRepository bookingRepository,
                                 ServiceRepository serviceRepository,
                                 AccountRepository accountRepository,
                                 BookingQueueService bookingQueueService) {
        this.bookingRepository = bookingRepository;
        this.serviceRepository = serviceRepository;
        this.accountRepository = accountRepository;
        this.bookingQueueService = bookingQueueService;
    }
    
    @Operation(summary = "Get list of items")
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String branchId,
            @RequestParam(required = false) String serviceId,
            @RequestParam(required = false) String status,
            Authentication auth) {
        
        String effectiveOrgId = orgId;
        if ((effectiveOrgId == null || effectiveOrgId.isBlank()) && auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String partnerOrgId = current.get().getOrgId();
                if (partnerOrgId != null && !partnerOrgId.isBlank()) {
                    effectiveOrgId = partnerOrgId;
                }
            }
        }
        
        List<Booking> bookings;
        if (serviceId != null && !serviceId.isBlank()) {
            bookings = bookingRepository.findByServiceIdAndArchivedFalse(serviceId);
        } else if (branchId != null && !branchId.isBlank()) {
            bookings = bookingRepository.findByBranchIdAndArchivedFalse(branchId);
        } else if (effectiveOrgId != null && !effectiveOrgId.isBlank()) {
            bookings = bookingRepository.findByOrgIdAndArchivedFalse(effectiveOrgId);
        } else {
            bookings = bookingRepository.findAll().stream()
                    .filter(b -> !b.isArchived())
                    .collect(Collectors.toList());
        }
        
        if (status != null && !status.isBlank()) {
            final String statusFilter = status;
            bookings = bookings.stream()
                    .filter(b -> statusFilter.equals(b.getStatus()))
                    .collect(Collectors.toList());
        }
        
        List<Map<String, Object>> result = bookings.stream()
                .map(this::buildBookingMap)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    @Operation(summary = "Get item by ID")
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        Booking booking = bookingOpt.get();
        
        // Проверка прав
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    @Operation(summary = "Execute confirm operation")
    @PostMapping("/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirm(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        bookingQueueService.confirmBooking(id);
        booking = bookingRepository.findById(id).orElse(booking);
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    @Operation(summary = "Execute start operation")
    @PostMapping("/{id}/start")
    public ResponseEntity<Map<String, Object>> start(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        bookingQueueService.startBooking(id);
        booking = bookingRepository.findById(id).orElse(booking);
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    @Operation(summary = "Execute complete operation")
    @PostMapping("/{id}/complete")
    public ResponseEntity<Map<String, Object>> complete(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        bookingQueueService.completeBooking(id);
        booking = bookingRepository.findById(id).orElse(booking);
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    @Operation(summary = "Execute cancel operation")
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty() || bookingOpt.get().isArchived()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        bookingQueueService.cancelBooking(id);
        booking = bookingRepository.findById(id).orElse(booking);
        return ResponseEntity.ok(buildBookingMap(booking));
    }
    
    @Operation(summary = "Delete an item")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        if (auth != null && auth.getName() != null) {
            Optional<Account> current = accountRepository.findById(auth.getName());
            if (current.isPresent() && !"SUPER_ADMIN".equals(current.get().getRole())) {
                String userOrgId = current.get().getOrgId();
                if (userOrgId == null || !userOrgId.equals(booking.getOrgId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                }
            }
        }
        
        booking.setArchived(true);
        booking.setUpdatedAt(Instant.now());
        bookingRepository.save(booking);
        return ResponseEntity.noContent().build();
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
