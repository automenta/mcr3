const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy to translate structured Prolog query answers into natural language.
 *
 * @param {object} llm - The language model instance.
 * @returns {object} A LangChain runnable sequence.
 */
const createAnswersToNlStrategy = (llm) => {
  const name = 'answers-to-nl';
  const description = 'Translates a list of structured Prolog answers into a concise, natural language summary.';

  const promptTemplate = new PromptTemplate({
    template: `
You are a helpful AI assistant. Your task is to summarize the results of a logic query in a clear, natural language sentence.

### Instructions:
1.  Review the original user query and the structured answers from the logic engine.
2.  Synthesize the information into a single, easy-to-understand sentence or a short paragraph if necessary.
3.  If there are no answers, state that clearly (e.g., "Based on the knowledge base, there is no answer to your query.").
4.  If the answers are boolean (true/false), respond with a simple confirmation or denial.
5.  Do not just list the variable bindings. Explain what they mean in the context of the original query.

### Example 1:
-   Original Query: "Who are the children of John?"
-   Structured Answers: [{{X: 'Mary'}}, {{X: 'Peter'}}]
-   Natural Language Summary: "The children of John are Mary and Peter."

### Example 2:
-   Original Query: "Is Socrates a man?"
-   Structured Answers: [true]
-   Natural Language Summary: "Yes, Socrates is a man."

### Example 3:
-   Original Query: "Who is the king of England?"
-   Structured Answers: []
-   Natural Language Summary: "I could not find an answer to who the king of England is."

### Your Task:
-   Original Query: "{query}"
-   Structured Answers: "{answers}"
   Natural Language Summary:`,
    inputVariables: ['query', 'answers'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createAnswersToNlStrategy;
