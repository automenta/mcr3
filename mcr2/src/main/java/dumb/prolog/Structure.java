package dumb.prolog;

import java.io.Serializable;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class Structure extends Term implements Serializable {
    private final Atom functor;
    private final List<Term> args;

    public Structure(Atom functor, List<Term> args) {
        this.functor = functor;
        this.args = args;
    }

    public Atom getFunctor() {
        return functor;
    }

    public List<Term> getArgs() {
        return args;
    }

    @Override
    public boolean isVariable() {
        return false;
    }

    @Override
    public String toString() {
        if (args.isEmpty()) {
            return functor.toString();
        }
        return functor + "(" + args.stream().map(Term::toString).collect(Collectors.joining(", ")) + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Structure structure = (Structure) o;
        return Objects.equals(functor, structure.functor) && Objects.equals(args, structure.args);
    }

    @Override
    public int hashCode() {
        return Objects.hash(functor, args);
    }
}
