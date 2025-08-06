package dumb.mcr.step;

import dumb.mcr.QueryResult;

public record PrologStep(String goal, QueryResult result) implements StepResult {
}
