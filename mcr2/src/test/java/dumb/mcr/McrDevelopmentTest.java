package dumb.mcr;

import dumb.lm.LMClient;
import dumb.lm.mock.MockChatModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class McrDevelopmentTest {

    private MCR mcr;
    private Session session;
    private MockChatModel mockChatModel;

    @BeforeEach
    void setUp() {
        // 1. Configure MCR with a mock client
        LMClient lmClient = new LMClient("mock", "mock-model", "mock-key");
        mockChatModel = (MockChatModel) lmClient.getChatModel();
        mcr = new MCR(lmClient);

        // 2. Create a Session
        session = mcr.createSession();

        // 3. Assert initial knowledge
        session.assertProlog("is_a(tweety, canary).");
        session.assertProlog("bird(X) :- is_a(X, canary).");
        session.assertProlog("can_fly(X) :- bird(X).");
    }

    @Test
    void testReasoningLoopWithMockLLM() {
        // This test simulates a two-step reasoning process.
        // The LLM first asks a question, then based on the result, it concludes.

        // 4. Configure the mock LLM's responses. These must be valid Prolog terms (no trailing period).
        String initialGoal = "has_wings(tweety)";
        String concludingGoal = "conclude('Yes, tweety can fly')";

        // The mock model is stateful. The first time it's called, it will return the initial goal.
        // We will then configure it to return the second goal.
        // A more robust mock would inspect the prompt's history.
        mockChatModel.setDefaultResponse(initialGoal);

        // 5. Use the Reasoning Agent
        // We need to manually guide the mock through the steps.
        ReasoningResult resultStep1 = session.reason("Can tweety fly?", 1);

        // After step 1, the history contains the result of "has_wings(tweety)."
        // Now we set the response for the second call.
        mockChatModel.setDefaultResponse(concludingGoal);

        // We call reason again. Because the session maintains the history, the LLM will see the
        // result of the first step and (in our mock scenario) decide to conclude.
        ReasoningResult finalResult = session.reason("Can tweety fly?", 2);


        // 6. Assert the result
        assertNotNull(finalResult, "Reasoning result should not be null.");

        // The Atom's toString() method does not include the quotes, so we expect the raw string.
        String expectedAnswer = "Yes, tweety can fly";
        assertEquals(expectedAnswer, finalResult.answer(),
            "The answer should match the argument of the conclude() goal.");
    }
}
