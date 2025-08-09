const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a translation strategy for converting a complex natural language assertion
 * into an array of Prolog facts.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createNlToMultiFactStrategy = (llm) => {
  const name = 'nl-to-multi-fact';
  const description = 'Translates a complex natural language statement into a list of Prolog facts. Use for compound statements like "Adam and Eve are human, and Cain is their son."';

  // An output parser that expects a JSON object with a "facts" key.
  const parser = new JsonOutputParser();

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and programming. Your task is to translate a natural language statement into a JSON object containing a list of valid Prolog facts.

### Instructions:
1.  Analyze the input statement and break it down into individual atomic statements.
2.  Convert each atomic statement into a valid Prolog fact.
3.  Each fact must end with a period (.).
4.  Use lowercase for predicates and atoms.
5.  Format the output as a JSON object with a single key "facts", which contains an array of strings. Each string in the array should be one Prolog fact.
6.  If the input contains only one fact, the array should contain a single string.

### Examples:
-   Input: "Socrates is a man and Plato is his student."
    Output: {{"facts": ["man('Socrates').", "student_of('Plato', 'Socrates')."]}}
-   Input: "The sky is blue."
    Output: {{"facts": ["is_blue('sky')."]}}
-   Input: "Adam was the first man, Eve was the first woman, and Cain was their son."
    Output: {{"facts": ["man('Adam').", "woman('Eve').", "son_of('Cain', 'Adam').", "son_of('Cain', 'Eve')."]}}

### Your Task:
Translate the following statement into a JSON object of Prolog facts:
Input: "{input}"
Output:`,
    inputVariables: ['input'],
    partialVariables: { format_instructions: parser.getFormatInstructions() },
  });

  const chain = promptTemplate.pipe(llm).pipe(parser);

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createNlToMultiFactStrategy;
