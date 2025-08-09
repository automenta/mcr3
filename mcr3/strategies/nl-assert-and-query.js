const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy for handling conditional questions by separating them
 * into an assertion and a query.
 */
const createAssertAndQueryStrategy = (llm) => {
  const name = 'nl-assert-and-query';
  const description = 'Handles a conditional question by splitting it into a temporary assertion and a subsequent query.';

  const promptTemplate = new PromptTemplate({
    template: `Analyze the following statement and break it down into a JSON object with "assertion" and "query" parts. Input: "{input}"`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new JsonOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createAssertAndQueryStrategy;
