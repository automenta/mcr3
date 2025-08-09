const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting conditional natural language
 * statements into Prolog rules.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToConditionalRuleStrategy = (llm) => {
  const name = 'nl-to-conditional-rule';
  const description = 'Translates a conditional natural language statement (e.g., "if...then...") into a Prolog rule. Use for complex logical relationships.';

  // A prompt that instructs the LLM to perform the translation into a Prolog rule.
  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic programming. Your task is to translate a conditional natural language statement into a single, valid Prolog rule.

### Instructions:
1.  The rule must be in the format: \`head :- body.\`.
2.  The head is the conclusion (the "then" part).
3.  The body is the condition (the "if" part), which may contain one or more goals separated by commas (representing AND).
4.  Use variables (uppercase letters like X, Y, Z) to represent generalized concepts.
5.  Use lowercase for predicates and atoms.
6.  Ensure the variables in the head also appear in the body.
7.  Do not include comments or any other text in the output.

### Examples:
-   Input: "If someone is a man, then they are mortal."
    Output: mortal(X) :- man(X).
-   Input: "All cats are animals."
    Output: animal(X) :- cat(X).
-   Input: "A person is a parent if they have a child."
    Output: parent(X) :- has_child(X, Y).
-   Input: "If X is the parent of Y and Y is the parent of Z, then X is the grandparent of Z."
    Output: grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

### Your Task:
Translate the following statement into a Prolog rule:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToConditionalRuleStrategy;
