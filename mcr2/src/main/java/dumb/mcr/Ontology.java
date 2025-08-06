package dumb.mcr;

import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

public class Ontology implements Serializable {

    private final Set<String> types = new HashSet<>();
    private final Set<String> relationships = new HashSet<>();
    private final Set<String> constraints = new HashSet<>();

    public void addType(String type) {
        types.add(type);
    }

    public void addRelationship(String relationship) {
        relationships.add(relationship);
    }

    public void addConstraint(String constraint) {
        constraints.add(constraint);
    }

    public boolean hasType(String type) {
        return types.contains(type);
    }

    public boolean hasRelationship(String relationship) {
        return relationships.contains(relationship);
    }

    public Set<String> getTypes() {
        return types;
    }

    public Set<String> getRelationships() {
        return relationships;
    }

    public Set<String> getConstraints() {
        return constraints;
    }
}
