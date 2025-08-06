package dumb.prolog;

import dumb.mcr.exceptions.ToolExecutionException;
import dumb.mcr.step.ToolStep;
import dumb.common.tools.Tool;
import dumb.common.tools.ToolProvider;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record Solver(List<Clause> knowledgeBase, ToolProvider toolProvider) {

    public record SolverResult(List<Map<Variable, Term>> solutions, ToolStep toolStep) {}

    public SolverResult solve(Term query) {
        List<Map<Variable, Term>> solutions = new ArrayList<>();
        ToolStep toolStep = solve(query, new HashMap<>(), solutions);
        return new SolverResult(solutions, toolStep);
    }

    private ToolStep solve(Term query, Map<Variable, Term> substitution, List<Map<Variable, Term>> solutions) {
        if (query instanceof Structure structure && "use_tool".equals(structure.getFunctor().getName()) && structure.getArgs().size() == 3) {
            return executeTool(structure, substitution, solutions);
        }

        for (Clause clause : knowledgeBase) {
            Map<Variable, Term> newSubst = Unification.unify(query, clause.head(), new HashMap<>(substitution));
            if (newSubst != null) {
                if (clause.isFact()) {
                    solutions.add(newSubst);
                } else {
                    solveBody(clause.body(), newSubst, solutions);
                }
            }
        }
        return null; // No tool was executed
    }

    private void solveBody(List<Term> body, Map<Variable, Term> substitution, List<Map<Variable, Term>> solutions) {
        if (body.isEmpty()) {
            solutions.add(substitution);
            return;
        }

        Term firstGoal = body.getFirst();
        List<Term> remainingGoals = body.subList(1, body.size());

        solve(firstGoal, substitution, (newSolutions, toolStep) -> {
            for (Map<Variable, Term> newSubst : newSolutions) {
                solveBody(remainingGoals, newSubst, solutions);
            }
        });
    }

    private void solve(Term query, Map<Variable, Term> substitution, SolutionCallback callback) {
        List<Map<Variable, Term>> solutions = new ArrayList<>();
        ToolStep toolStep = solve(query, substitution, solutions);
        callback.onSolutions(solutions, toolStep);
    }

    private ToolStep executeTool(Structure toolQuery, Map<Variable, Term> substitution, List<Map<Variable, Term>> solutions) {
        try {
            if (toolProvider == null) {
                throw new ToolExecutionException("No tool provider configured.");
            }

            Term toolNameTerm = toolQuery.getArgs().get(0);
            Term argsListTerm = toolQuery.getArgs().get(1);
            Term resultVariable = toolQuery.getArgs().get(2);

            if (!(toolNameTerm instanceof Atom toolNameAtom)) {
                throw new ToolExecutionException("Tool name must be an atom.");
            }
            String toolName = toolNameAtom.getName();

            Map<String, Object> args = parseArgs(argsListTerm);
            if (args == null) {
                throw new ToolExecutionException("Invalid tool arguments.");
            }

            Tool tool = toolProvider.getTools().get(toolName);
            if (tool == null) {
                throw new ToolExecutionException("Tool not found: " + toolName);
            }

            String result = tool.run(args);
            Map<Variable, Term> newSubst = Unification.unify(resultVariable, new Atom(result), substitution);
            if (newSubst != null) {
                solutions.add(newSubst);
            }

            // Return the details of the tool execution
            return new ToolStep(toolName, args, result);

        } catch (Exception e) {
            // In case of an error, we wrap it in a runtime exception.
            // A more robust implementation would have custom, checked exceptions.
            throw new ToolExecutionException("Error executing tool: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> parseArgs(Term argsListTerm) {
        Map<String, Object> args = new HashMap<>();
        Term current = argsListTerm;

        while (current instanceof Structure listNode && ".".equals(listNode.getFunctor().getName()) && listNode.getArgs().size() == 2) {
            Term head = listNode.getArgs().get(0);
            if (head instanceof Structure prop && "prop".equals(prop.getFunctor().getName()) && prop.getArgs().size() == 2) {
                Term keyTerm = prop.getArgs().get(0);
                Term valueTerm = prop.getArgs().get(1);

                if (keyTerm instanceof Atom keyAtom) {
                    args.put(keyAtom.getName(), valueTerm.toString());
                } else {
                    return null; // Key must be an atom
                }
            } else {
                return null; // List element must be a prop/2 structure
            }
            current = listNode.getArgs().get(1);
        }

        if (current instanceof Atom atom && "[]".equals(atom.getName())) {
            return args; // End of list
        }

        return null; // Malformed list
    }

    // Helper interface for callback
    private interface SolutionCallback {
        void onSolutions(List<Map<Variable, Term>> solutions, ToolStep toolStep);
    }
}
