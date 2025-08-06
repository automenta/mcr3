package dumb.prolog;

import java.io.Serializable;
import java.util.List;

public record Clause(Structure head, List<Term> body) implements Serializable {

    public boolean isFact() {
        return body.isEmpty();
    }
}
