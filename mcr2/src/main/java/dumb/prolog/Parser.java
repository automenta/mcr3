package dumb.prolog;

import java.util.ArrayList;
import java.util.List;
import dumb.mcr.exceptions.PrologParseException;

import java.util.regex.Pattern;

public class Parser {

    private static final Pattern ATOM_PATTERN = Pattern.compile("[a-z][a-zA-Z0-9_]*");
    private static final Pattern VARIABLE_PATTERN = Pattern.compile("[A-Z_][a-zA-Z0-9_]*");

    public static Clause parseClause(String text) {
        text = text.trim();
        if (text.endsWith(".")) {
            text = text.substring(0, text.length() - 1);
        }

        String[] parts = text.split(":-", 2);
        Structure head = (Structure) parseTerm(parts[0].trim());
        List<Term> body = new ArrayList<>();
        if (parts.length > 1) {
            String bodyString = parts[1].trim();
            if (!bodyString.isEmpty()) {
                body = parseBody(bodyString);
            }
        }
        return new Clause(head, body);
    }

    private static List<Term> parseBody(String bodyString) {
        List<Term> body = new ArrayList<>();
        if (bodyString == null || bodyString.isEmpty()) {
            return body;
        }

        int parenCount = 0;
        boolean inQuote = false;
        int start = 0;

        for (int i = 0; i < bodyString.length(); i++) {
            char c = bodyString.charAt(i);

            if (c == '\'') {
                inQuote = !inQuote;
            } else if (c == '(' && !inQuote) {
                parenCount++;
            } else if (c == ')' && !inQuote) {
                parenCount--;
            } else if (c == ',' && parenCount == 0 && !inQuote) {
                body.add(parseTerm(bodyString.substring(start, i).trim()));
                start = i + 1;
            }
        }
        body.add(parseTerm(bodyString.substring(start).trim()));
        return body;
    }

    public static Term parseTerm(String text) {
        text = text.trim();
        if (text.equals("[]")) {
            return new Atom("[]");
        }
        if (text.endsWith(")")) {
            int openParen = text.indexOf('(');
            if (openParen == -1) {
                throw new PrologParseException("Invalid term format: " + text);
            }
            String functorName = text.substring(0, openParen);
            Atom functor = new Atom(functorName);
            String argsStr = text.substring(openParen + 1, text.length() - 1);
            List<Term> args = new ArrayList<>();
            if (!argsStr.isEmpty()) {
                args = parseBody(argsStr);
            }
            return new Structure(functor, args);
        } else if (text.startsWith("'") && text.endsWith("'")) {
            return new Atom(text.substring(1, text.length() - 1));
        } else if (VARIABLE_PATTERN.matcher(text).matches()) {
            return new Variable(text);
        } else if (ATOM_PATTERN.matcher(text).matches()) {
            return new Atom(text);
        } else {
            throw new PrologParseException("Cannot parse term: " + text);
        }
    }
}
