package uz.superapp.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
public class PromoConditionEngine {

    public boolean evaluate(Map<String, Object> config, Map<String, Object> context) {
        if (config == null || !config.containsKey("conditions")) {
            return true;
        }

        List<Map<String, Object>> conditions = (List<Map<String, Object>>) config.get("conditions");
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }

        // Default logic: ALL conditions must be met (AND)
        for (Map<String, Object> condition : conditions) {
            String type = (String) condition.get("type");
            Object value = condition.get("value");

            if (!evaluateCondition(type, value, context)) {
                return false;
            }
        }

        return true;
    }

    private boolean evaluateCondition(String type, Object value, Map<String, Object> context) {
        switch (type) {
            case "TIME_RANGE":
                return evaluateTimeRange(value, context);
            case "WEEKDAYS":
                return evaluateWeekdays(value, context);
            case "SERVICE_TYPE":
                return evaluateEquals(value, context.get("serviceType"));
            case "MIN_ORDER_AMOUNT":
                return evaluateGte(value, context.get("orderAmount"));
            case "FIRST_ORDER":
                return evaluateEquals(value, context.get("isFirstOrder"));
            default:
                // If unknown condition type, fail safe or log warning
                return true;
        }
    }

    private boolean evaluateTimeRange(Object value, Map<String, Object> context) {
        if (!(value instanceof Map))
            return false;
        Map<String, String> range = (Map<String, String>) value;

        LocalTime now = context.containsKey("currentTime") ? LocalTime.parse((String) context.get("currentTime"))
                : LocalTime.now();

        LocalTime start = LocalTime.parse(range.get("from"));
        LocalTime end = LocalTime.parse(range.get("to"));

        return (now.isAfter(start) || now.equals(start)) && (now.isBefore(end) || now.equals(end));
    }

    private boolean evaluateWeekdays(Object value, Map<String, Object> context) {
        if (!(value instanceof List))
            return false;
        List<String> allowedDays = (List<String>) value;

        String currentDay = context.containsKey("currentDay") ? (String) context.get("currentDay")
                : LocalDateTime.now().getDayOfWeek().toString();

        return allowedDays.contains(currentDay);
    }

    private boolean evaluateEquals(Object expected, Object actual) {
        if (expected == null || actual == null)
            return false;
        return expected.toString().equals(actual.toString());
    }

    private boolean evaluateGte(Object expected, Object actual) {
        if (expected == null || actual == null)
            return false;
        try {
            double exp = Double.parseDouble(expected.toString());
            double act = Double.parseDouble(actual.toString());
            return act >= exp;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
