package uz.superapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import uz.superapp.domain.ControllerCommand;
import uz.superapp.domain.ControllerNode;
import uz.superapp.repository.ControllerCommandRepository;
import uz.superapp.repository.ControllerNodeRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class CommandQueueService {

    private final ControllerNodeRepository controllerNodeRepository;
    private final ControllerCommandRepository controllerCommandRepository;
    private final ObjectMapper objectMapper;

    public CommandQueueService(ControllerNodeRepository controllerNodeRepository,
                               ControllerCommandRepository controllerCommandRepository,
                               ObjectMapper objectMapper) {
        this.controllerNodeRepository = controllerNodeRepository;
        this.controllerCommandRepository = controllerCommandRepository;
        this.objectMapper = objectMapper;
    }

    public void updateControllerHeartbeat(String controllerId) {
        Instant now = Instant.now();

        Optional<ControllerNode> existingOpt = controllerNodeRepository.findByControllerId(controllerId);
        ControllerNode node;
        if (existingOpt.isPresent()) {
            node = existingOpt.get();
        } else {
            node = new ControllerNode();
            node.setControllerId(controllerId);
            node.setName("Controller " + controllerId);
        }
        node.setLastPing(now);
        node.setActive(true);
        controllerNodeRepository.save(node);
    }

    public List<ControllerCommand> getPendingCommands(String controllerId) {
        return controllerCommandRepository.findByControllerIdAndStatusOrderByPriorityDescCreatedAtAsc(
                controllerId,
                "pending"
        );
    }

    public ControllerCommand createCommand(String controllerId,
                                           String commandType,
                                           String commandStr,
                                           int priority) {
        ControllerCommand cmd = new ControllerCommand();
        cmd.setControllerId(controllerId);
        cmd.setCommandType(commandType);
        cmd.setCommandStr(commandStr);
        cmd.setPriority(priority);
        cmd.setStatus("pending");
        cmd.setCreatedAt(Instant.now());
        return controllerCommandRepository.save(cmd);
    }

    public boolean markCommandExecuted(String commandId, String executionResult) {
        Optional<ControllerCommand> cmdOpt = controllerCommandRepository.findById(commandId);
        if (cmdOpt.isEmpty()) {
            return false;
        }
        ControllerCommand cmd = cmdOpt.get();
        cmd.setStatus("executed");
        cmd.setResult(executionResult);
        cmd.setExecutedAt(Instant.now());
        controllerCommandRepository.save(cmd);
        return true;
    }

    public boolean markCommandFailed(String commandId, String errorMessage) {
        Optional<ControllerCommand> cmdOpt = controllerCommandRepository.findById(commandId);
        if (cmdOpt.isEmpty()) {
            return false;
        }
        ControllerCommand cmd = cmdOpt.get();
        cmd.setStatus("failed");
        cmd.setResult(errorMessage);
        cmd.setExecutedAt(Instant.now());
        controllerCommandRepository.save(cmd);
        return true;
    }

    public void finishPendingCommands(String controllerId) {
        List<ControllerCommand> pending = getPendingCommands(controllerId);
        if (pending.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (ControllerCommand cmd : pending) {
            cmd.setStatus("executed");
            cmd.setExecutedAt(now);
        }
        controllerCommandRepository.saveAll(pending);
    }

    /**
     * Helper to parse commandStr JSON into JsonNode.
     */
    public JsonNode parseCommandPayload(ControllerCommand command) {
        if (command == null || command.getCommandStr() == null) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(command.getCommandStr());
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}

