package dumb.mcr;

import dumb.prolog.Clause;
import dumb.prolog.Parser;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class KnowledgeGraph implements Serializable {

    private final List<Clause> clauses = new ArrayList<>();

    public void addClause(String clauseString) {
        clauses.add(Parser.parseClause(clauseString));
    }

    public void removeClause(String clauseString) {
        clauses.removeIf(c -> c.toString().equals(clauseString));
    }

    public List<Clause> getClauses() {
        return clauses;
    }
}
