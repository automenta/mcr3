package dumb.mcr;

import dumb.mcr.exceptions.PrologParseException;
import dumb.mcr.exceptions.ToolExecutionException;
import dumb.common.tools.ToolProvider;
import dumb.prolog.Parser;
import dumb.prolog.Solver;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ErrorHandlingTest {

    @Test
    public void testPrologParseException() {
        assertThrows(PrologParseException.class, () -> Parser.parseTerm("a(b,c"));
    }

    @Test
    public void testToolExecutionException_noProvider() {
        Solver solver = new Solver(new ArrayList<>(), null);
        assertThrows(PrologParseException.class, () -> solver.solve(Parser.parseTerm("use_tool(a,b,C).")));
    }

    @Test
    public void testToolExecutionException_toolNotFound() {
        ToolProvider mockToolProvider = mock(ToolProvider.class);
        when(mockToolProvider.getTools()).thenReturn(Collections.emptyMap());
        Solver solver = new Solver(new ArrayList<>(), mockToolProvider);
        assertThrows(PrologParseException.class, () -> solver.solve(Parser.parseTerm("use_tool(a,b,C).")));
    }

    @Test
    public void testToolExecutionException_toolNotFound_validQuery() {
        ToolProvider mockToolProvider = mock(ToolProvider.class);
        when(mockToolProvider.getTools()).thenReturn(Collections.emptyMap());
        Solver solver = new Solver(new ArrayList<>(), mockToolProvider);
        assertThrows(ToolExecutionException.class, () -> solver.solve(Parser.parseTerm("use_tool(a,[],C)")));
    }
}
