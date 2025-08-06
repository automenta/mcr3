# 🧠 MCR: The Neurosymbolic Reasoning Core (Java Edition)

**Model Context Reasoner (MCR)** is a Java library designed to be the foundation for the next generation of AI systems.
It fuses the perceptual power of Large Language Models (LLMs) with the rigorous logic of a symbolic reasoner, creating a
hybrid system that is both intuitive and verifiable.

This library provides the tools to build applications that can understand the world, reason about it with logical
precision, and explain their conclusions.

## 🏛️ Core Principles

MCR is built on a foundation designed for limitless growth.

1. **Symbolic Core, Neural Interface:** At its heart is a deterministic, verifiable logic engine (a custom Prolog
   interpreter). LLMs act as a fluid, intuitive interface, translating the unstructured, ambiguous human world into the
   structured, logical core.
2. **Explainable by Design:** Every conclusion can be traced back to the specific facts and rules that produced it. The
   system can always "show its work," providing a level of transparency impossible with purely neural systems.
3. **Dynamic Knowledge Graph:** The knowledge base is not a static set of facts but a living, dynamic graph that is
   continuously updated and refined through interaction.
4. **Ontology-Aware:** Define a schema for your knowledge using ontologies. The system can validate new facts against
   the ontology to maintain semantic consistency.

## 🔭 Vision: The Neurosymbolic Brain

The `mcr` (Model Context Reasoner) module is the **brain** of the operation. Its ultimate purpose is to provide the
intelligence, reasoning, and planning capabilities that will make the agent truly autonomous.

* **Hybrid Intelligence:** Combine the strengths of Large Language Models (LLMs) and symbolic reasoning:
    * **LLMs for Creativity and Fluency:** Use LLMs for their powerful natural language understanding, code generation,
      and ability to handle ambiguity.
    * **Symbolic Reasoning for Logic and Correctness:** Use symbolic reasoning for formal verification, logical
      inference, and ensuring that the generated code is not just plausible, but provably correct and free of
      vulnerabilities.
* **Deep Code Understanding:** Build a rich, semantic "world model" of the codebase. This model would go far beyond a
  simple syntax tree, understanding the architecture, the intent behind the code, and the complex relationships between
  different components.
* **Strategic Planning:** Use the world model to perform long-term strategic planning, breaking down complex software
  development goals into a series of well-defined steps for the `autohack` agent to execute.

## ✨ Features

* **Library-First API**: A clean, straightforward Java API for integration into any Java application.
* **Stateful Reasoning Sessions**: Create isolated `Session` objects, each with its own independent knowledge graph and
  ontology.
* **LLM-Powered Natural Language Queries**: Translate plain English questions into formal Prolog queries using an LLM.
* **Agentic Reasoning**: A high-level `reason()` method that uses an LLM to break down complex tasks into a series of
  logical steps.
* **Built-in Prolog Engine**: A lightweight, embedded Prolog solver for symbolic reasoning.

## 🚀 Quick Start

### Prerequisites

- Java JDK (11 or higher)
- Maven
- An OpenAI API key (or any other compatible LLM provider)

### Setup

Add the MCR module as a dependency in your `pom.xml`.

### Example Usage

Create a `.env` file in your project root or set the `OPENAI_API_KEY` environment variable.

```java
// main.java

import dumb.mcr.MCR;
import dumb.mcr.QueryResult;
import dumb.mcr.ReasoningResult;
import dumb.mcr.Session;
import dumb.prolog.Term;
import prolog.dumb.mcr.Variable;

import java.util.Map;
import java.util.Properties;

public class MCRExample {
    public static void main(String[] args) {
        // 1. Configure MCR
        Properties config = new Properties();
        config.setProperty("llm.provider", "openai");
        config.setProperty("llm.apiKey", System.getenv("OPENAI_API_KEY"));
        config.setProperty("llm.model", "gpt-4o-mini");

        MCR mcr = new MCR(config);

        // 2. Create a Session
        Session session = mcr.createSession();

        // 3. Define an Ontology
        session.getOntology().addType("bird");
        session.getOntology().addType("canary");
        session.getOntology().addRelationship("likes");
        session.getOntology().addRelationship("is_a");

        // 4. Assert Knowledge into the Graph
        session.assertProlog("is_a(tweety, canary).");
        session.assertProlog("bird(X) :- is_a(X, canary).");
        session.assertProlog("has_wings(X) :- bird(X).");
        session.addRelationship("tweety", "likes", "seeds");

        // 5. Query the Knowledge Graph
        // 5a. Direct Prolog Query
        QueryResult prologResult = session.query("has_wings(tweety).");
        System.out.println("Prolog Query 'has_wings(tweety).':");
        System.out.println("  Success: " + prologResult.success());
        System.out.println("  Solutions: " + prologResult.getBindings());

        // 5b. Natural Language Query (uses LLM)
        QueryResult naturalResult = session.nquery("what does tweety like?");
        System.out.println("\nNatural Language Query 'what does tweety like?':");
        System.out.println("  Translated Prolog: " + naturalResult.getPrologQuery());
        System.out.println("  Success: " + naturalResult.success());
        if (naturalResult.success() && naturalResult.getBindings() != null) {
            for (Map<Variable, Term> solution : naturalResult.getBindings()) {
                System.out.println("  Solution: " + solution);
            }
        }

        // 6. Use the Reasoning Agent (uses LLM)
        System.out.println("\nReasoning Task: 'Determine if tweety can fly, assuming canaries can fly.'");
        // The agent will need to be taught this rule as part of the reasoning process.
        session.assertProlog("can_fly(X) :- is_a(X, canary).");
        ReasoningResult reasoningResult = session.reason("Determine if tweety can fly.");
        System.out.println("  Reasoning Steps:");
        reasoningResult.history().forEach(step -> System.out.println("    - " + step));
        System.out.println("  Final Answer: " + reasoningResult.answer());
    }
}
```

## 📦 API Reference (Partial)

### `MCR` Class

* `new MCR(Properties config)`: Creates a new MCR instance.
    * `config` should contain `llm.provider`, `llm.apiKey`, and `llm.model`.
* `createSession()`: Creates a new `Session` object.
* `createSession(ToolProvider toolProvider)`: Creates a session with access to external tools.

### `Session` Class

Represents an isolated reasoning code and its knowledge graph.

* `assertProlog(String clause)`: Directly asserts a Prolog clause into the knowledge graph.
* `retractProlog(String clause)`: Removes a specific Prolog clause.
* `addFact(String entity, String type)`: Adds a typed fact (e.g., `bird(tweety)`), validated against the ontology.
* `addRelationship(String subject, String relation, String object)`: Adds a relationship (e.g., `likes(tweety, seeds)`).
* `addRule(String rule)`: Adds a Prolog rule.
* `query(String prologQuery)`: Executes a direct Prolog query. Returns a `QueryResult`.
* `nquery(String naturalLanguageQuery)`: Translates a natural language question to Prolog and executes it. Returns a
  `QueryResult`.
* `reason(String taskDescription)`: Uses an agentic loop to solve a higher-level goal. Returns a `ReasoningResult`.
* `getKnowledgeGraph()`: Returns the `KnowledgeGraph` instance.
* `getOntology()`: Returns the `Ontology` instance.
