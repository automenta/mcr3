package dumb.mcr;

import dumb.mcr.step.StepResult;

import java.util.List;

public record ReasoningResult(String answer, List<StepResult> history) {
}
