package dumb.mcr;

import dumb.lm.LMClient;
import dumb.lm.LMResponse;
import dumb.mcr.step.PrologStep;
import dumb.mcr.step.StepResult;
import dumb.common.tools.Tool;
import dumb.common.tools.ToolProvider;
import dumb.prolog.Parser;
import dumb.prolog.Solver;
import dumb.prolog.Structure;
import dumb.prolog.Term;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;
import java.util.stream.Collectors;

public class Session {

    private final LMClient lmClient;
    private KnowledgeGraph knowledgeGraph;
    private Ontology ontology;
    private final ToolProvider toolProvider;
    private Solver solver;

    public Session(LMClient lmClient, ToolProvider toolProvider) {
        this.lmClient = lmClient;
        this.knowledgeGraph = new KnowledgeGraph();
        this.ontology = new Ontology();
        this.toolProvider = toolProvider;
        resetSolver();
        assertToolFacts();
    }

    private String loadPrompt(String name) {
        String resourcePath = "/prompts/" + name;
        try (InputStream inputStream = Session.class.getResourceAsStream(resourcePath)) {
            if (inputStream == null) {
                throw new IllegalArgumentException("Resource not found: " + resourcePath);
            }
            try (Scanner scanner = new Scanner(inputStream, StandardCharsets.UTF_8)) {
                return scanner.useDelimiter("\\A").next();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to load prompt: " + name, e);
        }
    }

    private void resetSolver() {
        this.solver = new Solver(knowledgeGraph.getClauses(), toolProvider);
    }

    private void assertToolFacts() {
        if (toolProvider != null) {
            for (Tool tool : toolProvider.getTools().values()) {
                String descriptionAtom = tool.description().replaceAll("[^a-zA-Z0-9]", "_").toLowerCase();
                knowledgeGraph.addClause("tool(" + tool.name() + ", " + descriptionAtom + ").");
            }
            resetSolver();
        }
    }

    public Result assertProlog(String clause) {
        if (clause == null || clause.isBlank()) {
            throw new IllegalArgumentException("Cannot assert a null or blank clause.");
        }
        knowledgeGraph.addClause(clause);
        resetSolver();
        return Result.success("Clause asserted successfully.");
    }

    public Result retractProlog(String clause) {
        knowledgeGraph.removeClause(clause);
        resetSolver();
        return Result.success("Clause retracted successfully.");
    }

    public Result addFact(String entity, String type) {
        if (!ontology.hasType(type)) {
            return Result.failure("Unknown type: " + type);
        }
        String fact = type + "(" + entity + ").";
        knowledgeGraph.addClause(fact);
        resetSolver();
        return Result.success("Fact added successfully.");
    }

    public Result addRelationship(String subject, String relation, String object) {
        if (!ontology.hasRelationship(relation)) {
            return Result.failure("Unknown relationship: " + relation);
        }
        String relationship = relation + "(" + subject + ", " + object + ").";
        knowledgeGraph.addClause(relationship);
        resetSolver();
        return Result.success("Relationship added successfully.");
    }

    public Result addRule(String rule) {
        if (!rule.contains(":-")) {
            return Result.failure("Invalid rule format. Expected 'head :- body.'");
        }
        knowledgeGraph.addClause(rule);
        resetSolver();
        return Result.success("Rule added successfully.");
    }

    public Ontology getOntology() {
        return ontology;
    }

    public KnowledgeGraph getKnowledgeGraph() {
        return knowledgeGraph;
    }

    public ToolProvider getToolProvider() {
        return toolProvider;
    }

    public QueryResult query(String prologQuery) {
        try {
            Term queryTerm = Parser.parseTerm(prologQuery);
            Solver.SolverResult solverResult = solver.solve(queryTerm);
            // The public query method does not return tool execution info, for now.
            return new QueryResult(!solverResult.solutions().isEmpty(), prologQuery, solverResult.solutions(), null);
        } catch (Exception e) {
            return new QueryResult(false, prologQuery, null, e.getMessage());
        }
    }

    public QueryResult nquery(String naturalLanguageQuery) {
        String prompt = buildNQueryPrompt(naturalLanguageQuery);
        LMResponse response = lmClient.generate(prompt);

        if (!response.success()) {
            return new QueryResult(false, naturalLanguageQuery, null, "LLM query translation failed: " + response.error());
        }

        String prologQuery = response.content().trim();
        if (!prologQuery.endsWith(".")) {
            prologQuery += ".";
        }

        return query(prologQuery);
    }

    private String buildNQueryPrompt(String naturalLanguageQuery) {
        String promptTemplate = loadPrompt("nquery.prompt");
        return promptTemplate
                .replace("{{ontology_types}}", ontology.getTypes().toString())
                .replace("{{ontology_relationships}}", ontology.getRelationships().toString())
                .replace("{{natural_language_query}}", naturalLanguageQuery);
    }

    public ReasoningResult reason(String taskDescription, int maxSteps) {
        List<StepResult> history = new ArrayList<>();
        // We don't add the initial task to the history, as it's not a StepResult.
        // The caller can manage the overall task description.

        for (int i = 0; i < maxSteps; i++) {
            String prompt = buildReasoningPrompt(taskDescription, history);
            LMResponse response = lmClient.generate(prompt);

            if (!response.success()) {
                return new ReasoningResult("LLM reasoning failed: " + response.error(), history);
            }

            String prologGoal = response.content().trim();
            if (prologGoal.isBlank()) continue;

            try {
                Term parsedGoal = Parser.parseTerm(prologGoal);

                // Handle the conclude signal directly
                if (parsedGoal instanceof Structure goalStructure && "conclude".equals(goalStructure.getFunctor().getName())) {
                    if (!goalStructure.getArgs().isEmpty()) {
                        // Return the first argument as the final answer.
                        String answer = goalStructure.getArgs().getFirst().toString();
                        return new ReasoningResult(answer, history);
                    } else {
                        return new ReasoningResult("Concluded.", history);
                    }
                }

                Solver.SolverResult solverResult = solver.solve(parsedGoal);

                QueryResult queryResult = new QueryResult(
                        !solverResult.solutions().isEmpty(),
                        prologGoal,
                        solverResult.solutions(),
                        null); // Assuming no error for now

                history.add(new PrologStep(prologGoal, queryResult));
                if (solverResult.toolStep() != null) {
                    history.add(solverResult.toolStep());
                }

            } catch (Exception e) {
                // Log the exception, maybe add an ErrorStep to history in the future.
                // For now, we'll just stop reasoning.
                return new ReasoningResult("Error executing goal: " + e.getMessage(), history);
            }
        }

        return new ReasoningResult("Max steps reached without conclusion.", history);
    }

    private String firstAnswer(QueryResult result) {
        var firstSolution = result.bindings().getFirst();
        return firstSolution.values().stream().findFirst().map(Object::toString).orElse("Concluded without a specific answer.");
    }

    private String formatStepResultForPrompt(StepResult step) {
        if (step instanceof PrologStep(String goal, QueryResult result)) {
            StringBuilder sb = new StringBuilder();
            sb.append("Goal '").append(goal).append("' result: ");

            if (!result.success()) {
                sb.append("Failed. Error: ").append(result.error());
            } else if (result.bindings() == null || result.bindings().isEmpty()) {
                sb.append("Success, but no solutions found (false).");
            } else {
                sb.append("Success with ").append(result.bindings().size()).append(" solution(s): ");
                String solutionsString = result.getBindings().stream()
                        .map(Object::toString)
                        .collect(Collectors.joining(", "));
                sb.append(solutionsString);
            }
            return sb.toString();
        }
        if (step instanceof dumb.mcr.step.ToolStep(String name, java.util.Map<String, Object> args, String result)) {
            return "Tool '" + name + "' was called with args " + args + " and returned: " + result;
        }
        return "Unknown step type.";
    }

    public ReasoningResult reason(String taskDescription) {
        return reason(taskDescription, 10);
    }

    public void save(String path) throws IOException {
        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(path))) {
            oos.writeObject(knowledgeGraph);
            oos.writeObject(ontology);
        }
    }

    public static Session load(String path, LMClient lmClient, ToolProvider toolProvider) throws IOException, ClassNotFoundException {
        try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(path))) {
            KnowledgeGraph knowledgeGraph = (KnowledgeGraph) ois.readObject();
            Ontology ontology = (Ontology) ois.readObject();
            Session session = new Session(lmClient, toolProvider);
            session.knowledgeGraph = knowledgeGraph;
            session.ontology = ontology;
            session.resetSolver();
            return session;
        }
    }

    private String buildReasoningPrompt(String taskDescription, List<StepResult> history) {
        String promptTemplate = loadPrompt("reason.prompt");
        String historyString = history.stream()
                .map(this::formatStepResultForPrompt)
                .collect(Collectors.joining("\n"));

        return promptTemplate
                .replace("{{task_description}}", taskDescription)
                .replace("{{ontology_types}}", ontology.getTypes().toString())
                .replace("{{ontology_relationships}}", ontology.getRelationships().toString())
                .replace("{{tools}}", buildToolManifest())
                .replace("{{history}}", historyString);
    }

    private String buildToolManifest() {
        if (toolProvider == null || toolProvider.getTools().isEmpty()) {
            return "No tools are available.";
        }
        StringBuilder manifest = new StringBuilder();
        manifest.append("You have access to the following tools:\n");
        for (Tool tool : toolProvider.getTools().values()) {
            manifest.append("- Tool: ").append(tool.name()).append("\n");
            manifest.append("  Description: ").append(tool.description()).append("\n");
        }
        return manifest.toString();
    }
}
