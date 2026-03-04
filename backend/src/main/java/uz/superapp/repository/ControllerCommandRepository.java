package uz.superapp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.superapp.domain.ControllerCommand;

import java.util.List;

public interface ControllerCommandRepository extends JpaRepository<ControllerCommand, String> {

    List<ControllerCommand> findByControllerIdAndStatusOrderByPriorityDescCreatedAtAsc(String controllerId,
            String status);
}
