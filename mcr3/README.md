# 🧠 Model Context Reasoner (MCR) v3 ✨

The **Model Context Reasoner (MCR)** is a powerful, API-driven system that serves as a **logic co-processor for your AI**. It fuses the powerful language understanding of Large Language Models (LLMs) with the precision of a formal logic reasoner, creating a hybrid system that is both intuitive and verifiable.

MCR is designed to be the **neurosymbolic brain** of an application, providing the intelligence, reasoning, and planning capabilities required to solve complex problems.

## 🎸 The MCR Philosophy: The "Guitar Pedal" for Reasoning

MCR is built with a "guitar pedal" philosophy: a single, plug-and-play unit that adds advanced reasoning to your AI stack with minimal setup. It's a self-contained service that you can easily "plug in" to an existing system via its modern WebSocket API to empower it with logic.

**Vision: The Symbiosis of Language and Logic**

LLMs excel at understanding nuance and intent in human language. Formal logic systems, like Prolog, offer precision and verifiability. MCR's vision is to create a seamless symbiosis between these two paradigms, enabling systems that can:

1.  **Understand Intent** through natural language (via LLMs).
2.  **Structure Knowledge** into formal representations (MCR + LLMs).
3.  **Reason Rigorously** over that knowledge (`tau-prolog` via MCR).
4.  **Communicate Results** back in an understandable way (MCR + LLMs).

This combination unlocks a new class of more robust, explainable, and sophisticated AI systems.

## 🔑 Core Concepts

1.  **Stateful Sessions**: All interactions occur within a `Session`, identified by a `sessionId`. Each session maintains its own independent **Knowledge Base**, allowing for parallel, isolated reasoning contexts.

2.  **The Knowledge Base (KB)**: A collection of symbolic logic clauses (facts and rules) in Prolog format. The KB is dynamic, allowing knowledge to be asserted, retracted, and updated on the fly.

3.  **LLM-Powered Translation**: MCR uses LLMs to bidirectionally translate between natural language and formal logic. This is the core mechanism for both understanding user input and explaining logical results.

4.  **Translation Strategies**: The methodology for converting natural language into logic is defined by **Translation Strategies**. These are configurable, pluggable pipelines that define how to prompt an LLM and process its output. In `mcr3`, these strategies are implemented using **`langchain.js`**, allowing for sophisticated, multi-step reasoning chains.

5.  **Terminal User Interface (TUI)**: MCR is operated through a powerful and intuitive terminal-based interface, providing direct access to its reasoning capabilities.

6.  **WebSocket-First API**: All core server interactions happen via a real-time WebSocket API, enabling features like live updates to a session's Knowledge Base and streaming responses.

## 🚀 Features

-   **Node.js Server**: A robust, standalone server built on Node.js, designed for performance and scalability.
-   **WebSocket-First API**: A real-time, bidirectional API for all core operations.
-   **`tau-prolog` Integration**: Leverages the power of `tau-prolog`, a fully-featured Prolog interpreter written in JavaScript, for all symbolic reasoning.
-   **`langchain.js` Powered**: Uses `langchain.js` for sophisticated LLM interactions, including prompt management, output parsing, and the creation of complex reasoning chains using LangChain Expression Language (LCEL).
-   **Terminal User Interface (TUI)**: A powerful and intuitive terminal-based interface for all user interaction, including session management and system analysis.
-   **Stateful, Persistent Sessions**: Supports both in-memory and file-based session storage, allowing knowledge bases to persist across server restarts.
-   **Extensible LLM Support**: Pluggable architecture for supporting various LLM providers (OpenAI, Gemini, Ollama, etc.).
-   **Automated Evolution Engine**: A self-optimizing system that autonomously discovers, evaluates, and refines translation strategies to continuously improve performance.
-   **MCP Integration**: Ready to serve as a reasoning tool for AI clients that support the Model Context Protocol.

## ⚙️ Core Services and API

The `MCRService` is the primary entry point for interacting with the MCR system. It exposes a set of methods for managing sessions and performing reasoning tasks.

-   `createSession()`: Creates a new, isolated reasoning session.
-   `assert(sessionId, naturalLanguageInput, strategyName)`: Translates a natural language statement into a Prolog fact or rule and asserts it into the knowledge base.
-   `query(sessionId, naturalLanguageInput, strategyName)`: Translates a natural language question into a Prolog query, executes it, and returns a natural language answer.
-   `explain(sessionId, prologRule)`: Translates a Prolog rule or fact into a natural language explanation.
-   `critiqueAndRefine(sessionId, prologRule)`: Critiques a given Prolog rule and suggests a refinement.
-   `explainQueryTrace(sessionId, query, trace)`: Explains the reasoning trace of a query in natural language.
-   `generateTestCases(sessionId, rule)`: Generates a set of test cases for a given Prolog rule.
-   `getKnowledgeBase(sessionId)`: Retrieves the current knowledge base for a session.

### Available Strategies

MCR3 comes with a set of pre-built strategies for various tasks. The `strategyName` parameter in methods like `assert` and `query` allows you to select the appropriate strategy for your needs.

-   `nl-to-fact`: For simple assertions (e.g., "Socrates is a man.").
-   `nl-to-multi-fact`: For more complex assertions that result in multiple facts.
-   `nl-to-rule`: For general-purpose rules.
-   `nl-to-conditional-rule`: For conditional rules (e.g., "if...then...").
-   `nl-to-query`: For translating questions into queries.
-   `answers-to-nl`: For summarizing query answers in natural language.
-   `rules-to-nl`: For explaining rules in natural language.
-   `critique-and-refine-rule`: For improving existing rules.
-   `query-trace-to-nl`: For explaining the reasoning trace of a query.
-   `generate-test-cases`: For generating test cases for a rule.

### `langchain.js` Integration

`mcr3` leverages `langchain.js` as the primary engine for orchestrating interactions with LLMs. This is a significant architectural choice that makes the system more modular, powerful, and easier to extend.

-   **Translation Strategies as Chains**: Instead of monolithic prompt templates, each **Translation Strategy** is defined as a `langchain.js` chain, likely using the **LangChain Expression Language (LCEL)**. This allows for clear, composable, and debuggable sequences of operations (e.g., `prompt | llm | output_parser`).

-   **Modular Components**: `langchain.js` provides robust components for:
    -   **Prompt Templates**: Managing and composing prompts.
    -   **LLM Wrappers**: Standardizing the interface to different LLM providers.
    -   **Output Parsers**: Reliably parsing LLM output from natural language into structured formats like JSON or directly into Prolog syntax.

-   **Simplified Strategy Execution**: The `StrategyExecutor`'s role becomes orchestrating the invocation of these pre-defined `langchain.js` chains, simplifying the core logic and delegating the complexities of the LLM interaction to LangChain. This makes it easier to experiment with and evolve new strategies.

### 🤖 The MCR Evolution Engine: AutoML for Logic

`mcr3` includes a sophisticated **Evolution Engine**, a supervisory control loop designed to autonomously discover, evaluate, and refine translation strategies. This engine works to continuously improve MCR's performance, accuracy, and efficiency, making the system not just intelligent, but intelligently self-improving.

The system is bootstrapped with functional, human-authored strategies, ensuring immediate usability. The evolution process runs asynchronously, augmenting the pool of available strategies with new, optimized versions.

#### Core Components

1.  **Optimization Coordinator**: This is the orchestrator of the entire evolution loop. It selects existing strategies for improvement, invokes the `StrategyEvolver` to create new candidates, evaluates them, and persists the results to the Performance Database.

2.  **Strategy Evolver**: Creates new candidate strategies by mutating existing ones. The primary mutation method is "Iterative Critique": it uses an LLM to critique and rewrite a strategy's prompt to address specific examples on which it previously failed.

3.  **Curriculum Generator**: Expands the set of evaluation cases to prevent overfitting and ensure strategies are robust. It analyzes performance data to identify weaknesses in the current test curriculum and uses an LLM to generate new, targeted evaluation examples.

4.  **Performance Database**: A SQLite database that stores the detailed results of every evaluation run. This data is crucial for all other components of the engine, providing the basis for strategy selection, evolution, and curriculum generation.

5.  **Input Router**: A runtime optimizer that is part of the `MCR Service`. For each incoming request, it can query the `Performance Database` to select the optimal strategy for that specific type of input, based on historical performance data (success rate, cost, latency).

### 🚀 Getting Started & MCP Integration

MCR3 is designed for two primary use cases:
1.  **Standalone Tool**: Interacting directly with the MCR engine via its powerful Terminal UI (TUI).
2.  **MCP Tool**: Serving as a reasoning engine for an AI agent or host that conforms to the Model Context Protocol (MCP).

#### 1. Installation & Setup

The setup process is the same for both use cases.

**A. Clone and Install:**
```bash
git clone https://github.com/your-repo/mcr3.git # Replace with the actual repo URL
cd mcr3
npm install
```

**B. Configure Your LLM:**
Create a `.env` file by copying the example, then add your LLM provider API key.
```bash
cp .env.example .env
# Now, edit .env
```
```dotenv
# .env
MCR_LLM_PROVIDER="openai" # or "gemini", "ollama"
OPENAI_API_KEY="sk-..."   # Your key here
```

**C. Start the MCR Server:**
This command launches the MCR WebSocket server, making it ready for connections from the TUI or an MCP client.
```bash
npm start
```
The server will start on the port configured in `.env` (default: `8080`).

#### 2. Usage as a Standalone Tool (TUI)

To interact with MCR directly, run the Terminal UI in a separate terminal.

```bash
npm run tui
```
The TUI provides an interactive command-line environment to create sessions, assert facts, ask questions, and manage the reasoning engine.

#### 3. Usage as an MCP Tool

MCR3 is a fully compliant MCP tool provider, ready to be auto-installed and used by MCP hosts.

**For MCP Hosts (Auto-Installation):**
An MCP host can install and run MCR3 with the following commands:
```bash
git clone https://github.com/your-repo/mcr3.git mcr3
cd mcr3
npm install
npm start
```
The host must also provide the necessary environment variables (e.g., `MCR_LLM_PROVIDER`, `OPENAI_API_KEY`) for the `.env` file.

**Connecting and Communicating:**
-   **Endpoint**: MCP clients should connect to the WebSocket server at `ws://localhost:8080/ws`.
-   **Protocol**: MCR3 listens for standard MCP `tool_invoke` and `tool_result` messages on this endpoint. It uses the `tool_name` to route requests to its internal functions.

**Example: Asserting a Fact via MCP**
An MCP client would send a JSON message like this over the WebSocket connection:
```json
{
  "type": "tool_invoke",
  "messageId": "msg_12345",
  "payload": {
    "tool_name": "session.assert",
    "input": {
      "sessionId": "session-abc",
      "nl_assertion": "Socrates is a man."
    }
  }
}
```

MCR3 will process this request and respond with a `tool_result` message.

### 🧪 Testing

The project includes a comprehensive test suite for the backend services.

-   **Run All Tests (Jest):**
    From the project root:
    ```bash
    npm test
    ```
