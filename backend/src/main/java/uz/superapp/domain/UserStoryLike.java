package uz.superapp.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "user_story_likes", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "story_id", "user_id" })
})
public class UserStoryLike {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "story_id", nullable = false)
    private UserStory story;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public UserStory getStory() {
        return story;
    }

    public void setStory(UserStory story) {
        this.story = story;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }
}
