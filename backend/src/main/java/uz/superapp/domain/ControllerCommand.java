package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("controller_commands")
public class ControllerCommand {

    @Id
    private String id;

    private String controllerId;
    private String commandType;
    private String commandStr;
    private int priority;
    private String status; // pending, executed, failed
    private String result;
    private Instant createdAt;
    private Instant executedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getControllerId() { return controllerId; }
    public void setControllerId(String controllerId) { this.controllerId = controllerId; }

    public String getCommandType() { return commandType; }
    public void setCommandType(String commandType) { this.commandType = commandType; }

    public String getCommandStr() { return commandStr; }
    public void setCommandStr(String commandStr) { this.commandStr = commandStr; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExecutedAt() { return executedAt; }
    public void setExecutedAt(Instant executedAt) { this.executedAt = executedAt; }
}

