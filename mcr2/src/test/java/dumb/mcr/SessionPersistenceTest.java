package dumb.mcr;

import dumb.lm.LMClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SessionPersistenceTest {

    @TempDir
    Path tempDir;

    @Test
    public void testSaveAndLoad() throws IOException, ClassNotFoundException {
        // Arrange
        LMClient lmClient = new LMClient("mock", "mock", "mock");

        Session session1 = new Session(lmClient, null);
        session1.assertProlog("is_a(tweety, canary).");
        session1.getOntology().addType("bird");

        Path sessionFile = tempDir.resolve("session.ser");

        // Act
        session1.save(sessionFile.toString());
        Session session2 = Session.load(sessionFile.toString(), lmClient, null);

        // Assert
        assertTrue(session2.getOntology().hasType("bird"));
        assertEquals(1, session2.getKnowledgeGraph().getClauses().size());
        assertEquals("is_a(tweety, canary)", session2.getKnowledgeGraph().getClauses().getFirst().head().toString());
    }
}
