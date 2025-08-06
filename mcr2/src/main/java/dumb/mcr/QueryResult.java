package dumb.mcr;

import dumb.prolog.Term;
import dumb.prolog.Variable;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record QueryResult(boolean success, String originalQuery, List<Map<Variable, Term>> bindings, String error) {

    public List<Map<String, String>> getBindings() {
        return bindings == null ? null : bindings.stream()
                .map(solution -> solution.entrySet().stream()
                        .collect(Collectors.toMap(e -> e.getKey().getName(), e -> e.getValue().toString())))
                .toList();
    }
}
