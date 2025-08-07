const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for explaining a Prolog rule in natural language.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createRulesToNlStrategy = (llm) => {
  const name = 'rules-to-nl';
  const description = 'Translates a Prolog rule or fact into a clear, natural language explanation.';

  // A prompt that instructs the LLM to perform the reverse translation.
  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and a brilliant communicator. Your task is to translate a formal Prolog rule into a clear, easy-to-understand natural language explanation.

### Instructions:
1.  Explain the rule as a general principle.
2.  Use placeholders like "someone," "something," "X," or "Y" to refer to variables.
3.  Phrase the explanation as a simple "if-then" statement or a descriptive sentence.
4.  Keep the language simple and direct.

### Examples:
-   Input: "mortal(X) :- man(X)."
    Output: "This rule states that if someone (X) is a man, then they are mortal."
-   Input: "parent(X, Y) :- has_child(X, Y)."
    Output: "This means that a person X is a parent if they have a child Y."
-   Input: "grandparent(X, Z) :- parent(X, Y), parent(Y, Z)."
    Output: "This rule defines a grandparent: X is the grandparent of Z if X is the parent of some Y, and that same Y is the parent of Z."
-   Input: "likes('John', 'Mary')."
    Output: "This is a simple fact which states that John likes Mary."

### Your Task:
Translate the following Prolog rule into a natural language explanation:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createRulesToNlStrategy;
