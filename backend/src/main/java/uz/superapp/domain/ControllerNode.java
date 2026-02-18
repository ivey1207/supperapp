package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document("controllers")
public class ControllerNode {

    @Id
    private String id;

    @Indexed(unique = true)
    private String controllerId;

    private String name;
    private String branchId;
    private boolean active;
    private Instant lastPing;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getControllerId() { return controllerId; }
    public void setControllerId(String controllerId) { this.controllerId = controllerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBranchId() { return branchId; }
    public void setBranchId(String branchId) { this.branchId = branchId; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getLastPing() { return lastPing; }
    public void setLastPing(Instant lastPing) { this.lastPing = lastPing; }
}

