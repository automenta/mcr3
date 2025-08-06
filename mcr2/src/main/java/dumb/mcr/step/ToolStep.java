package dumb.mcr.step;

import java.util.Map;

public record ToolStep(String toolName, Map<String, Object> args, String result) implements StepResult {
}
