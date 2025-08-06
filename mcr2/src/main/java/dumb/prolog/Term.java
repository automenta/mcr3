package dumb.prolog;

import java.io.Serializable;

public abstract class Term implements Serializable {
    public abstract boolean isVariable();
}
