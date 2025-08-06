package dumb.prolog;

import java.io.Serializable;
import java.util.Objects;

public class Atom extends Term implements Serializable {
    private final String name;

    public Atom(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    @Override
    public boolean isVariable() {
        return false;
    }

    @Override
    public String toString() {
        return name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Atom atom = (Atom) o;
        return Objects.equals(name, atom.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }
}
