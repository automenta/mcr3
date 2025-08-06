package dumb.mcr;

import dumb.lm.LMClient;
import dumb.prolog.Term;
import dumb.prolog.Variable;

import java.util.Map;

public class MCRExample {
    public static void main(String[] args) {
        // 1. Configure MCR
        LMClient lmClient = new LMClient("mock", "mock", "mock");
        MCR mcr = new MCR(lmClient);

        // 2. Create a Session
        Session session = mcr.createSession();

        // 3. Define an Ontology
        session.getOntology().addType("bird");
        session.getOntology().addType("canary");
        session.getOntology().addRelationship("likes");
        session.getOntology().addRelationship("is_a");

        // 4. Assert Knowledge into the Graph
        session.assertProlog("is_a(tweety, canary).");
        session.assertProlog("bird(X) :- is_a(X, canary).");
        session.assertProlog("has_wings(X) :- bird(X).");
        session.addRelationship("tweety", "likes", "seeds");

        // 5. Query the Knowledge Graph
        // 5a. Direct Prolog Query
        QueryResult prologResult = session.query("has_wings(tweety).");
        System.out.println("Prolog Query 'has_wings(tweety).':");
        System.out.println("  Success: " + prologResult.success());
        System.out.println("  Solutions: " + prologResult.bindings());

        // 5b. Natural Language Query (uses LLM)
        QueryResult naturalResult = session.nquery("what does tweety like?");
        System.out.println("\nNatural Language Query 'what does tweety like?':");
        System.out.println("  Translated Prolog: " + naturalResult.originalQuery());
        System.out.println("  Success: " + naturalResult.success());
        if (naturalResult.success() && naturalResult.bindings() != null) {
            for (Map<Variable, Term> solution : naturalResult.bindings()) {
                System.out.println("  Solution: " + solution);
            }
        }

        // 6. Use the Reasoning Agent (uses LLM)
        System.out.println("\nReasoning Task: 'Determine if tweety can fly, assuming canaries can fly.'");
        // The agent will need to be taught this rule as part of the reasoning process.
        session.assertProlog("can_fly(X) :- is_a(X, canary).");
        ReasoningResult reasoningResult = session.reason("Determine if tweety can fly.");
        System.out.println("  Reasoning Steps:");
        reasoningResult.history().forEach(step -> System.out.println("    - " + step));
        System.out.println("  Final Answer: " + reasoningResult.answer());
    }
}
