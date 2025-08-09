const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting a Prolog fact into a
 * natural language sentence.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createFactToNlStrategy = (llm) => {
  const name = 'fact-to-nl';
  const description = 'Translates a single Prolog fact into a natural language sentence. Use for explaining a piece of knowledge.';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and human-readable explanations. Your task is to translate a single, valid Prolog fact into a clear and concise natural language sentence.

### Instructions:
1.  The output should be a single sentence.
2.  The sentence should be grammatically correct and sound natural.
3.  Interpret the predicate and its arguments as a statement of fact.

### Examples:
-   Input: man('Socrates').
    Output: Socrates is a man.
-   Input: student_of('Plato', 'Socrates').
    Output: Plato is a student of Socrates.
-   Input: is_blue('sky').
    Output: The sky is blue.
-   Input: likes('John', 'Mary').
    Output: John likes Mary.
-   Input: father_of('Adam', 'Cain').
    Output: Adam is the father of Cain.


### Your Task:
Translate the following Prolog fact into a natural language sentence:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createFactToNlStrategy;
