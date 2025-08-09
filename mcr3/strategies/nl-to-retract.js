const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting a natural language command
 * into a Prolog `retract` or `retractall` statement.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToRetractStrategy = (llm) => {
  const name = 'nl-to-retract';
  const description = 'Translates a natural language command into a Prolog `retract` or `retractall` statement to remove facts or rules. Use for commands like "remove the fact that socrates is a man" or "forget the rule about mortals".';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and programming. Your task is to translate a natural language command for removing information into a valid Prolog 'retract' or 'retractall' statement.

### Instructions:
1.  The statement must end with a period (.).
2.  Use 'retract/1' for specific facts or rules.
3.  Use 'retractall/1' to remove all facts or rules that match a pattern (e.g., 'retractall(man(_))' to remove all man facts).
4.  The argument to retract must be a valid Prolog clause.
5.  Do not include comments or any other text in the output.

### Examples:
-   Input: "Remove the fact that Socrates is a man."
    Output: retract(man('Socrates')).
-   Input: "Forget that Plato is a student of Socrates."
    Output: retract(student_of('Plato', 'Socrates')).
-   Input: "Remove the rule that says all men are mortal."
    Output: retract((mortal(X) :- man(X))).
-   Input: "Delete all knowledge about who is a student."
    Output: retractall(student_of(_, _)).
-   Input: "Retract the assertion that the sky is blue."
    Output: retract(is_blue('sky')).

### Your Task:
Translate the following command into a single Prolog retract statement:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToRetractStrategy;
