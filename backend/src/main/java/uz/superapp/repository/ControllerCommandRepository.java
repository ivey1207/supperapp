package uz.superapp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import uz.superapp.domain.ControllerCommand;

import java.util.List;

public interface ControllerCommandRepository extends MongoRepository<ControllerCommand, String> {

    List<ControllerCommand> findByControllerIdAndStatusOrderByPriorityDescCreatedAtAsc(String controllerId, String status);
}

