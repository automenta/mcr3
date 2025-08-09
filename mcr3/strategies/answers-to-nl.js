const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy to translate structured Prolog query answers into natural language.
 */
const createAnswersToNlStrategy = (llm) => {
  const name = 'answers-to-nl';
  const description = 'Translates a list of structured Prolog answers into a concise, natural language summary.';

  const promptTemplate = new PromptTemplate({
    template: `Summarize the results of a logic query in a clear, natural language sentence. Query: "{query}", Answers: "{answers}"`,
    inputVariables: ['query', 'answers'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createAnswersToNlStrategy;
