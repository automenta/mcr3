const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting complex natural language statements
 * into multiple Prolog rules.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToMultiRuleStrategy = (llm) => {
  const name = 'nl-to-multi-rule';
  const description = 'Translates a complex natural language statement into one or more Prolog rules. Use for statements that imply multiple conditions or definitions.';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and programming. Your task is to translate a natural language statement into one or more valid Prolog rules.

### Instructions:
1.  Each rule must end with a period (.).
2.  If the input implies multiple conditions for a single outcome, generate a separate rule for each condition.
3.  Use variables (e.g., X, Y, Z) to represent general concepts.
4.  Do not include comments or any other text in the output. Output only the Prolog rules.
5.  Each rule should be on a new line.

### Examples:
-   Input: "A person is happy if they are rich or famous."
    Output:
    happy(X) :- rich(X).
    happy(X) :- famous(X).
-   Input: "Someone is a parent if they are a mother or a father."
    Output:
    parent(X) :- mother(X).
    parent(X) :- father(X).
-   Input: "A location is a city if it is in the USA and has a large population. A location is also a city if it is the capital of a country."
    Output:
    city(X) :- in_usa(X), has_large_population(X).
    city(X) :- capital_of_country(X, _).

### Your Task:
Translate the following statement into one or more Prolog rules:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  // We expect a string output with rules separated by newlines.
  // The MCRService will handle splitting this into an array.
  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToMultiRuleStrategy;
