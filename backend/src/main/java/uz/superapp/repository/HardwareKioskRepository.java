package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.HardwareKiosk;

import java.util.List;
import java.util.Optional;

public interface HardwareKioskRepository extends MongoRepository<HardwareKiosk, String> {
    
    Optional<HardwareKiosk> findByMacIdAndArchivedFalse(String macId);
    
    List<HardwareKiosk> findByArchivedFalse();
    
    List<HardwareKiosk> findByStatusAndArchivedFalse(String status);
    
    List<HardwareKiosk> findByOrgIdAndArchivedFalse(String orgId);
    
    List<HardwareKiosk> findByOrgIdIsNullAndArchivedFalse();
    
    List<HardwareKiosk> findByStatusAndOrgIdIsNullAndArchivedFalse(String status);
}
