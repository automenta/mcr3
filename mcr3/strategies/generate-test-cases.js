const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy to generate test cases for a given Prolog rule.
 */
const createGenerateTestCasesStrategy = (llm) => {
  const name = 'generate-test-cases';
  const description = 'Generates a set of natural language test cases (positive and negative) for a given Prolog rule.';

  const promptTemplate = new PromptTemplate({
    template: `Generate test cases for the following Prolog rule: {rule}`,
    inputVariables: ['rule'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new JsonOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createGenerateTestCasesStrategy;
