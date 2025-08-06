package dumb.mcr.step;

import java.io.Serializable;

public sealed interface StepResult extends Serializable permits PrologStep, ToolStep {
}
