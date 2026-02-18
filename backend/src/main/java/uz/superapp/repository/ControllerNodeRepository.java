package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.ControllerNode;

import java.util.Optional;

public interface ControllerNodeRepository extends MongoRepository<ControllerNode, String> {

    Optional<ControllerNode> findByControllerId(String controllerId);
}

