const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy to explain the reasoning trace of a Prolog query in natural language.
 *
 * @param {object} llm - The language model instance.
 * @returns {object} A LangChain runnable sequence.
 */
const createQueryTraceToNlStrategy = (llm) => {
  const name = 'query-trace-to-nl';
  const description = 'Explains the reasoning trace of a Prolog query in natural language, showing how a conclusion was reached.';

  const promptTemplate = new PromptTemplate({
    template: `
You are a helpful AI assistant and an expert in logic. Your task is to explain the reasoning process of a Prolog query given the query, the knowledge base, and the execution trace.

### Instructions:
1.  Review the original query, the knowledge base, and the execution trace.
2.  Provide a step-by-step explanation of how the logic engine arrived at the conclusion.
3.  Start by stating the goal of the query.
4.  For each step in the trace, explain which rule or fact was used and how it contributed to the solution.
5.  Conclude with the final answer.
6.  The explanation should be clear, concise, and easy for a non-technical user to understand.

### Example:
-   **Knowledge Base**:
    man('Socrates').
    mortal(X) :- man(X).
-   **Query**: "Is Socrates mortal?" (in Prolog: mortal('Socrates').)
-   **Trace**:
    1.  Call: mortal('Socrates')
    2.  Redo: mortal('Socrates')
    3.  Call: man('Socrates')
    4.  Exit: man('Socrates')
    5.  Exit: mortal('Socrates')
-   **Natural Language Explanation**:
    "To determine if Socrates is mortal, the system first checked the rule that states 'a being is mortal if they are a man'. It then checked if Socrates is a man, which is a known fact in the knowledge base. Since Socrates is a man, the system concluded that Socrates is mortal."

### Your Task:
-   **Knowledge Base**:
    {knowledge_base}
-   **Query**: "{query}"
-   **Trace**:
    {trace}
-   **Natural Language Explanation**:`,
    inputVariables: ['knowledge_base', 'query', 'trace'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createQueryTraceToNlStrategy;
