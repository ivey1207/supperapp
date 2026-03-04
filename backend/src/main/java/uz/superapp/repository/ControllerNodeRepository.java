package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.superapp.domain.ControllerNode;

import java.util.Optional;

public interface ControllerNodeRepository extends JpaRepository<ControllerNode, String> {

    Optional<ControllerNode> findByControllerId(String controllerId);
}
