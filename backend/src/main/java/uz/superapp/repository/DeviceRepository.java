package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.Device;

import java.util.List;
import java.util.Optional;

public interface DeviceRepository extends MongoRepository<Device, String> {

    List<Device> findByArchivedFalse();

    List<Device> findByOrgIdAndArchivedFalse(String orgId);

    Optional<Device> findByMacIdAndArchivedFalse(String macId);

    // Для авто-назначения: найти активные устройства организации
    List<Device> findByStatusAndOrgIdAndBranchIdIsNullAndArchivedFalse(String status, String orgId);

    // Для авто-назначения: найти активные устройства без организации
    List<Device> findByStatusAndOrgIdIsNullAndArchivedFalse(String status);

    // Для авто-назначения: найти активные устройства, не привязанные к филиалу
    List<Device> findByStatusAndBranchIdIsNullAndArchivedFalse(String status);

    List<Device> findByBranchIdAndArchivedFalse(String branchId);

    List<Device> findByOrgIdAndBranchIdIsNullAndArchivedFalse(String orgId);

    List<Device> findByBranchIdIsNullAndArchivedFalse();
}
