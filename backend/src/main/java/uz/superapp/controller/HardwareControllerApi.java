package uz.superapp.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.superapp.domain.ControllerCommand;
import uz.superapp.domain.HardwareKiosk;
import uz.superapp.repository.HardwareKioskRepository;
import uz.superapp.service.CommandQueueService;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/controller")
public class HardwareControllerApi {

    private final CommandQueueService commandQueueService;
    private final HardwareKioskRepository hardwareKioskRepository;

    public HardwareControllerApi(CommandQueueService commandQueueService,
            HardwareKioskRepository hardwareKioskRepository) {
        this.commandQueueService = commandQueueService;
        this.hardwareKioskRepository = hardwareKioskRepository;
    }

    @PostMapping("/heartbeat/{macId}")
    public ResponseEntity<Map<String, Object>> controllerHeartbeat(
            @PathVariable String macId,
            @RequestBody(required = false) Map<String, Object> statusData) {
        String normalizedMacId = macId.trim().toUpperCase();

        // Найдём киоск по MAC-адресу, так как команды в базе привязываются именно к
        // KIOSK- ID
        var kioskOpt = hardwareKioskRepository.findByMacIdAndArchivedFalse(normalizedMacId);

        if (kioskOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message",
                            "Hardware Kiosk not found for this MAC ID: " + normalizedMacId));
        }

        HardwareKiosk kiosk = kioskOpt.get();
        String controllerId = kiosk.getKioskId();

        // Update or create controller node with lastPing + active flag
        commandQueueService.updateControllerHeartbeat(controllerId);

        // Fetch pending commands for this controller (like legacy project)
        List<ControllerCommand> pendingCommands = commandQueueService.getPendingCommands(controllerId);

        ControllerCommand pauseCmd = null;
        ControllerCommand latestCmd = null;
        for (ControllerCommand cmd : pendingCommands) {
            if ("pause_service".equals(cmd.getCommandType())) {
                pauseCmd = cmd;
            }
            if (latestCmd == null
                    || (cmd.getCreatedAt() != null && cmd.getCreatedAt().isAfter(latestCmd.getCreatedAt()))) {
                latestCmd = cmd;
            }
        }
        ControllerCommand selectedCmd = pauseCmd != null ? pauseCmd : latestCmd;

        List<Map<String, Object>> commandsResponse = new ArrayList<>();
        if (selectedCmd != null) {
            JsonNode payload = commandQueueService.parseCommandPayload(selectedCmd);
            Map<String, Object> commandResponse = new LinkedHashMap<>();
            commandResponse.put("id", selectedCmd.getId());
            commandResponse.put("type", selectedCmd.getCommandType());
            commandResponse.put("command_type", selectedCmd.getCommandType());
            commandResponse.put("action",
                    payload.path("action").isMissingNode() ? null : payload.path("action").asText(null));
            commandResponse.put("post_id",
                    payload.path("post_id").isMissingNode() ? null : payload.path("post_id").asText(null));
            commandResponse.put("command_format", payload.path("command_format").isMissingNode() ? null
                    : payload.path("command_format").asText(null));
            commandResponse.put("frame",
                    payload.path("frame").isMissingNode() ? null : payload.path("frame").asText(null));
            commandResponse.put("priority", selectedCmd.getPriority());
            commandResponse.put("created_at",
                    selectedCmd.getCreatedAt() != null ? selectedCmd.getCreatedAt().toString() : null);

            // extra fields for some command types (kept for compatibility with legacy
            // project)
            if ("kiosk_topup".equals(selectedCmd.getCommandType())) {
                commandResponse.put("kiosk_id",
                        payload.path("kiosk_id").isMissingNode() ? null : payload.path("kiosk_id").asText(null));
                commandResponse.put("kiosk_name",
                        payload.path("kiosk_name").isMissingNode() ? null : payload.path("kiosk_name").asText(null));
                commandResponse.put("amount",
                        payload.path("amount").isMissingNode() ? null : payload.path("amount").asDouble());
                commandResponse.put("cash_from_admin", payload.path("cash_from_admin").isMissingNode() ? null
                        : payload.path("cash_from_admin").asBoolean());
                commandResponse.put("timestamp",
                        payload.path("timestamp").isMissingNode() ? null : payload.path("timestamp").asText(null));
            } else if ("payment_received".equals(selectedCmd.getCommandType())) {
                commandResponse.put("payment_amount", payload.path("payment_amount").isMissingNode() ? null
                        : payload.path("payment_amount").asDouble());
                commandResponse.put("payment_type", payload.path("payment_type").isMissingNode() ? "online"
                        : payload.path("payment_type").asText("online"));
                commandResponse.put("service_name", payload.path("service_name").isMissingNode() ? null
                        : payload.path("service_name").asText(null));
                commandResponse.put("service_cost",
                        payload.path("service_cost").isMissingNode() ? null : payload.path("service_cost").asDouble());
            }

            commandsResponse.add(commandResponse);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("controller_id", controllerId);
        response.put("commands", commandsResponse);
        response.put("server_time", Instant.now().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/command/{commandId}/executed")
    public ResponseEntity<Map<String, Object>> markCommandExecuted(
            @PathVariable String commandId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(defaultValue = "success") String executionResult) {
        // Fallback: If body contains "executionResult", use it (for controllers sending
        // JSON).
        if (body != null && body.containsKey("executionResult")) {
            executionResult = String.valueOf(body.get("executionResult"));
        }

        boolean ok = commandQueueService.markCommandExecuted(commandId, executionResult);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "Command not found"));
        }
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Command marked as executed"));
    }

    @PostMapping("/command/{commandId}/failed")
    public ResponseEntity<Map<String, Object>> markCommandFailed(
            @PathVariable String commandId,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String errorMessage) {
        if (errorMessage == null && body != null && body.containsKey("errorMessage")) {
            errorMessage = String.valueOf(body.get("errorMessage"));
        }
        if (errorMessage == null) {
            errorMessage = "Unknown error";
        }

        boolean ok = commandQueueService.markCommandFailed(commandId, errorMessage);
        if (!ok) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("status", "error", "message", "Command not found"));
        }
        return ResponseEntity.ok(Map.of("status", "ok", "message", "Command marked as failed"));
    }
}
