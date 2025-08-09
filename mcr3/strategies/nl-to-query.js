const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting a natural language question
 * into a Prolog query.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToQueryStrategy = (llm) => {
  const name = 'nl-to-query';
  const description = 'Translates a natural language question into a Prolog query. Use for questions like "Who is a man?" or "Who are the parents of Cain?".';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and programming. Your task is to translate a natural language question into a single, valid Prolog query.

### Instructions:
1.  The query must end with a period (.).
2.  Use lowercase for predicates and atoms.
3.  Use variables (e.g., X, Y, Who, What) to represent the unknown information the user is asking for.
4.  The variable names in the output MUST be the same as the variable names used in the question. If the question uses "who", the query must use "Who". If it uses "what", use "What".
5.  Do not include comments or any other text in the output.

### Examples:
-   Input: "Who is a man?"
    Output: man(Who).
-   Input: "Who is the father of Cain?"
    Output: father_of(Who, 'Cain').
-   Input: "What does John like?"
    Output: likes('John', What).
-   Input: "Who are the parents of Abel?"
    Output: parent_of(Who, 'Abel').

### Your Task:
Translate the following question into a Prolog query:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToQueryStrategy;
