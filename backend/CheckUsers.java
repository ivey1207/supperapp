
import java.sql.*;

public class CheckUsers {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/superapp";
        String user = "user";
        String password = "password";

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            // Count all specialists
            String countSql = "SELECT COUNT(*) FROM app_users WHERE is_specialist = true";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(countSql)) {
                if (rs.next()) {
                    System.out.println("TOTAL_SPECIALISTS: " + rs.getInt(1));
                }
            }

            // Find Ibrohim
            String findSql = "SELECT full_name, phone, email, is_specialist FROM app_users WHERE full_name ILIKE '%Ibrohim%' OR email ILIKE '%Ibrohim%'";
            try (Statement stmt = conn.createStatement(); ResultSet rs = stmt.executeQuery(findSql)) {
                System.out.println("USER_RESULTS_START");
                while (rs.next()) {
                    System.out.println(String.format("Name: %s, Phone: %s, Email: %s, Specialist: %b",
                            rs.getString("full_name"), rs.getString("phone"), rs.getString("email"),
                            rs.getBoolean("is_specialist")));
                }
                System.out.println("USER_RESULTS_END");
            }
        } catch (SQLException e) {
            System.err.println("DB_ERROR: " + e.getMessage());
        }
    }
}
