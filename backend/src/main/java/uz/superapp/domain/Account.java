package uz.superapp.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Set;

@Document("accounts")
public class Account {
    @Id
    private String id;
    @Indexed(unique = true)
    private String email;
    private String passwordHash;
    private String fullName;
    private String role;
    private String orgId;
    private Set<String> assignedBranchIds;
    private boolean archived;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getOrgId() { return orgId; }
    public void setOrgId(String orgId) { this.orgId = orgId; }
    public Set<String> getAssignedBranchIds() { return assignedBranchIds; }
    public void setAssignedBranchIds(Set<String> assignedBranchIds) { this.assignedBranchIds = assignedBranchIds; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
