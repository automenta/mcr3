package dumb.prolog;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Unification {

    public static Map<Variable, Term> unify(Term x, Term y, Map<Variable, Term> substitution) {
        if (substitution == null) {
            return null;
        }
        x = substitute(x, substitution);
        y = substitute(y, substitution);

        if (x.equals(y)) {
            return substitution;
        } else if (x instanceof Variable) {
            return unifyVariable((Variable) x, y, substitution);
        } else if (y instanceof Variable) {
            return unifyVariable((Variable) y, x, substitution);
        } else if (x instanceof Structure s1 && y instanceof Structure s2) {
            if (!s1.getFunctor().equals(s2.getFunctor()) || s1.getArgs().size() != s2.getArgs().size()) {
                return null;
            }
            for (int i = 0; i < s1.getArgs().size(); i++) {
                substitution = unify(s1.getArgs().get(i), s2.getArgs().get(i), substitution);
                if (substitution == null) {
                    return null;
                }
            }
            return substitution;
        } else {
            return null;
        }
    }

    private static Map<Variable, Term> unifyVariable(Variable var, Term x, Map<Variable, Term> substitution) {
        if (substitution.containsKey(var)) {
            return unify(substitution.get(var), x, substitution);
        } else if (x instanceof Variable && substitution.containsKey(x)) {
            return unify(var, substitution.get(x), substitution);
        } else {
            Map<Variable, Term> newSubst = new HashMap<>(substitution);
            newSubst.put(var, x);
            return newSubst;
        }
    }

    public static Term substitute(Term term, Map<Variable, Term> substitution) {
        if (term instanceof Variable && substitution.containsKey(term)) {
            return substitute(substitution.get(term), substitution);
        } else if (term instanceof Structure s) {
            List<Term> newArgs = new ArrayList<>();
            for (Term arg : s.getArgs()) {
                newArgs.add(substitute(arg, substitution));
            }
            return new Structure(s.getFunctor(), newArgs);
        } else {
            return term;
        }
    }
}
