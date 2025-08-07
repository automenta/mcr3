const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting simple natural language assertions
 * into Prolog facts.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToFactStrategy = (llm) => {
  const name = 'nl-to-fact';
  const description = 'Translates a simple natural language statement into a single Prolog fact. Use for basic assertions like "Socrates is a man."';

  // A prompt that instructs the LLM to perform the translation.
  // It includes examples to guide the model (few-shot prompting).
  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and programming. Your task is to translate a natural language statement into a single, valid Prolog fact.

### Instructions:
1.  The fact must end with a period (.).
2.  Use lowercase for predicates and atoms.
3.  Represent the statement as a predicate with one or more arguments in parentheses.
4.  If the statement involves a relationship, the predicate should represent the relationship.
5.  If an entity has a property, the predicate should be the property.
6.  Do not include comments or any other text in the output.

### Examples:
-   Input: "Socrates is a man."
    Output: man('Socrates').
-   Input: "Plato is a student of Socrates."
    Output: student_of('Plato', 'Socrates').
-   Input: "The sky is blue."
    Output: is_blue('sky').
-   Input: "John likes Mary."
    Output: likes('John', 'Mary').

### Your Task:
Translate the following statement into a Prolog fact:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  // Attach name and description to the returned chain for the StrategyManager
  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToFactStrategy;
