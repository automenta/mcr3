const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');

/**
 * Creates a strategy that critiques and refines a proposed Prolog rule.
 *
 * @param {object} llm - The language model instance to use for the strategy.
 * @returns {object} A LangChain runnable sequence.
 */
const createCritiqueAndRefineRuleStrategy = (llm) => {
  const name = 'critique-and-refine-rule';
  const description = 'Critiques a proposed Prolog rule for logical soundness and clarity, then refines it. Use to improve the quality of new rules.';

  const promptTemplate = new PromptTemplate({
    template: `
You are an expert in logic, programming, and critical thinking. Your task is to analyze a proposed Prolog rule, critique it, and then provide a refined version.

### Instructions:
1.  **Analyze the Input Rule**: Understand its purpose and logic.
2.  **Critique**: Write a brief critique of the rule. Consider the following:
    *   Is it logically sound?
    *   Is it syntactically correct?
    *   Is the naming clear (predicates and variables)?
    *   Does it handle potential edge cases?
    *   Could it lead to infinite recursion?
3.  **Refine**: Based on your critique, write a new, improved version of the rule. If the original rule was good, you can state that and provide the original rule as the refined version.
4.  **Format the Output**: Provide only the final, refined Prolog rule as a single string. Do not include your critique or any other explanatory text in the final output. The rule must end with a period.

### Example:
-   Input: "sibling(X, Y) :- parent(Z, X), parent(Z, Y)."
    Critique: This rule is a good start, but it has a major flaw: it defines a person as their own sibling because X and Y can be the same. It needs an explicit check to ensure X and Y are not the same person.
    Refined Rule: sibling(X, Y) :- parent(Z, X), parent(Z, Y), X \\= Y.

### Your Task:
Analyze, critique, and refine the following Prolog rule.

Input Rule: "{input}"

Refined Rule:`,
    inputVariables: ['input'],
  });

  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());

  chain.name = name;
  chain.description = description;

  return chain;
};

module.exports = createCritiqueAndRefineRuleStrategy;
