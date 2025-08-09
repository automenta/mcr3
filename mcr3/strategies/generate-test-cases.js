const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy to generate test cases for a given Prolog rule.
 *
 * @param {object} llm - The language model instance.
 * @returns {object} A LangChain runnable sequence.
 */
const createGenerateTestCasesStrategy = (llm) => {
  const name = 'generate-test-cases';
  const description = 'Generates a set of natural language test cases (positive and negative) for a given Prolog rule.';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic and software testing. Your task is to generate a set of test cases for a given Prolog rule. The test cases should be in natural language and should include both positive examples (that should succeed) and negative examples (that should fail).

### Instructions:
1.  Analyze the given Prolog rule to understand its logic.
2.  Create a list of natural language sentences that would translate into facts and rules needed to test the given rule.
3.  Create a list of questions in natural language that test the rule. Include both positive and negative test cases.
4.  The output should be a JSON object with two keys: "setup" and "assertions".
5.  "setup" should be an array of strings, where each string is a natural language statement that provides the necessary context (facts and rules) for the test.
6.  "assertions" should be an array of objects, where each object has two keys: "query" and "expected".
7.  "query" should be a natural language question to ask.
8.  "expected" should be the expected answer to the query (e.g., "Yes", "No", or a specific answer like "Socrates").

### Example:
-   **Prolog Rule**: \`mortal(X) :- man(X).\`
-   **Output**:
    \`\`\`json
    {{
      "setup": [
        "Socrates is a man.",
        "Plato is a man.",
        "Zeus is a god."
      ],
      "assertions": [
        {{
          "query": "Is Socrates mortal?",
          "expected": "Yes"
        }},
        {{
          "query": "Is Plato mortal?",
          "expected": "Yes"
        }},
        {{
          "query": "Is Zeus mortal?",
          "expected": "No"
        }}
      ]
    }}
    \`\`\`

### Your Task:
Generate test cases for the following Prolog rule:
**Prolog Rule**: \`{rule}\`
**Output**:
`,
    inputVariables: ['rule'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new JsonOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createGenerateTestCasesStrategy;
