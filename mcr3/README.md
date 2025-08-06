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

5.  **MCR Workbench**: A comprehensive, web-based Single Page Application (SPA) that serves as the primary user interface for interacting with MCR. It provides modes for interactive reasoning, system analysis, and managing the Evolution Engine.

6.  **WebSocket-First API**: All core server interactions happen via a real-time WebSocket API, enabling features like live updates to a session's Knowledge Base and streaming responses.

## 🚀 Features

-   **Node.js Server**: A robust, standalone server built on Node.js, designed for performance and scalability.
-   **WebSocket-First API**: A real-time, bidirectional API for all core operations.
-   **`tau-prolog` Integration**: Leverages the power of `tau-prolog`, a fully-featured Prolog interpreter written in JavaScript, for all symbolic reasoning.
-   **`langchain.js` Powered**: Uses `langchain.js` for sophisticated LLM interactions, including prompt management, output parsing, and the creation of complex reasoning chains using LangChain Expression Language (LCEL).
-   **MCR Workbench UI**: A rich Single Page Application for all user interaction, including session management, system analysis, and control of the Evolution Engine.
-   **Stateful, Persistent Sessions**: Supports both in-memory and file-based session storage, allowing knowledge bases to persist across server restarts.
-   **Extensible LLM Support**: Pluggable architecture for supporting various LLM providers (OpenAI, Gemini, Ollama, etc.).
-   **Automated Evolution Engine**: A self-optimizing system that autonomously discovers, evaluates, and refines translation strategies to continuously improve performance.
-   **MCP Integration**: Ready to serve as a reasoning tool for AI clients that support the Model Context Protocol.

## 🏛️ System Architecture

The MCR architecture is designed for modularity and separation of concerns.

-   **Presentation Layer**: Any client that consumes the API (e.g., the MCR Workbench, a custom script).
-   **API Layer**: The WebSocket message handlers that define the public contract for interacting with MCR.
-   **Service Layer**: The core orchestrator (`mcrService.js`) that manages session state and executes requests by invoking the appropriate services and strategies.
-   **Strategy & Execution Layer**: This layer, powered by `langchain.js`, is responsible for executing **Translation Strategies**. The `StrategyExecutor` uses LCEL chains to manage the interaction between prompts, LLMs, and output parsers.
-   **Provider Layer**: Concrete implementations for external services, including LLM Providers (`Ollama`, `Gemini`, etc.) and the `PrologReasoner` (interfacing with `tau-prolog`).

```mermaid
graph TD
    subgraph User Facing
        Workbench[MCR Workbench UI]
        API_Client[API Client]
    end

    subgraph MCR Server
        direction LR
        WSH[WebSocket Handler]

        subgraph Core Logic
            MCR_Service[MCR Service]
            SM[Strategy Manager]
            SE[Strategy Executor (langchain.js)]
            RS[Reasoner Service (tau-prolog)]
            SS[Session Store]
        end

        subgraph Providers
            LLM[LLM Provider]
            Prolog[Prolog Reasoner]
        end

        subgraph Evolution Engine
            Optimizer
            Evolver
            CurriculumGen
            PerfDB[(Performance DB)]
        end
    end

    Workbench -- WebSocket API --> WSH
    API_Client -- WebSocket API --> WSH
    WSH -- Invokes --> MCR_Service
    MCR_Service -- Uses --> SM
    MCR_Service -- Uses --> SE
    MCR_Service -- Uses --> RS
    MCR_Service -- Manages --> SS
    SM -- Provides Strategy --> SE
    SE -- Uses --> LLM
    RS -- Uses --> Prolog

    MCR_Service -- Triggers --> Optimizer
    Optimizer -- Uses --> Evolver
    Optimizer -- Uses --> CurriculumGen
    Optimizer -- Accesses --> PerfDB
    MCR_Service -- Uses data from --> PerfDB

    classDef core fill:#ddeeff,stroke:#333,stroke-width:2px;
    classDef external fill:#e6ffcc,stroke:#333,stroke-width:2px;
    classDef engine fill:#fff0b3,stroke:#333,stroke-width:2px;

    class MCR_Service,SM,SE,RS,SS,WSH core;
    class Workbench,API_Client,LLM,Prolog external;
    class Optimizer,Evolver,CurriculumGen,PerfDB engine;

```

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

### 🏁 Quick Start

This section guides you through getting a production-like instance of MCR running locally.

**1. Clone & Install:**

```bash
git clone <repository_url> mcr3
cd mcr3
npm install
```

**2. Configure Your LLM:**

Create a `.env` file in the project root by copying `.env.example`. Then, edit `.env` to add your chosen LLM provider API key and other settings.

```dotenv
# .env
MCR_LLM_PROVIDER="openai" # or gemini, ollama
OPENAI_API_KEY="sk-..."
```

**3. Build the MCR Workbench UI:**

The MCR Workbench is a React/Vite application. For production, you must build its static assets.

```bash
# From the project root
cd ui
npm install
npm run build
cd ..
```

**4. Start the MCR Server:**

The server will automatically serve the built UI assets.

```bash
# From the project root
npm start
```

The server will start on the configured port (e.g., `http://localhost:8080`).

### 🖥️ MCR Workbench

The MCR Workbench is the primary graphical interface for MCR. Once the server is running, simply navigate to its URL (e.g., `http://localhost:8080`) in your web browser.

**Features:**
-   Interactive chat for assertions and queries.
-   Live view of a session's Knowledge Base.
-   Manage and select translation strategies.
-   View performance dashboards and control the Evolution Engine.

### 🔌 API Reference

The `mcr3` service operates on a **WebSocket-first** principle. The API is designed for real-time, stateful interaction, making it ideal for building responsive applications.

-   **Connection**: Clients connect to the server via `ws://<host>:<port>/ws`.
-   **Message Format**: All messages are JSON strings.

#### Core Message Pattern

The API follows a simple `tool_invoke` / `tool_result` pattern.

1.  **Client to Server: `tool_invoke`**
    -   The client requests an action.
    -   Structure: `{ "type": "tool_invoke", "messageId": "...", "payload": { "tool_name": "...", "input": {...} } }`

2.  **Server to Client: `tool_result`**
    -   The server responds to the request.
    -   The `messageId` from the request is echoed back for correlation.
    -   Structure: `{ "type": "tool_result", "messageId": "...", "payload": { "success": boolean, "data": {...}, "error": "..." } }`

#### Available Tools (Summary)

The `tool_name` parameter determines which action is performed. The API provides a rich set of tools, including:

-   **Session Management**:
    -   `session.create`, `session.get`, `session.delete`: Manage reasoning sessions.
    -   `session.assert`: Assert natural language into a session's KB.
    -   `session.query`: Query a session's KB using natural language.
    -   `session.set_kb`: Directly overwrite a session's KB with Prolog code.
-   **Ontology Management**:
    -   `ontology.create`, `ontology.list`, `ontology.get`, `ontology.update`, `ontology.delete`: Manage global, reusable ontologies.
-   **Direct Translation**:
    -   `translate.nlToRules`: Translate NL to Prolog without affecting a session.
    -   `translate.rulesToNl`: Translate Prolog rules into an NL explanation.
-   **Strategy Management**:
    -   `strategy.list`, `strategy.setActive`, `strategy.getActive`: Manage and inspect translation strategies.
-   **System Analysis & Evolution**:
    -   `analysis.*`: A suite of tools for inspecting performance data and curricula.
    -   `evolution.*`: Tools to control the Evolution Engine (start, stop, get status).
-   **Utility & Debugging**:
    -   `llm.passthrough`: Send text directly to the LLM.
    -   `utility.debugFormatPrompt`: Inspect how prompts are formatted.

*(For a complete list of tools and their detailed `input` and `payload` structures, a full `WEBSOCKET_API.md` document will be maintained.)*

#### Model Context Protocol (MCP) Integration

`mcr3` is designed to act as a tool provider for AI agents that use the **Model Context Protocol (MCP)**.

-   **Primary Transport**: MCP communication is handled over the **same WebSocket connection** as the primary tool API. The server will differentiate between MCR and MCP messages based on their structure.
-   **Architectural Flexibility**: While WebSocket is the primary transport, the architecture is designed to be adaptable. If an MCP client requires a different transport mechanism (e.g., HTTP long-polling or `stdio`), a dedicated **bridge** can be implemented. This bridge would translate the client's transport protocol into the MCR's internal tool invocation system, requiring no changes to the core logic.

### 🛠️ Development Setup

For UI development, you can run the Vite development server for hot reloading. This requires running two processes in separate terminals.

1.  **Start the MCR Backend Server:**
    ```bash
    # In terminal 1 (project root)
    npm start
    ```

2.  **Start the Vite UI Dev Server:**
    ```bash
    # In terminal 2 (project root)
    cd ui
    npm run dev
    ```
    Access the UI via the Vite URL shown in the terminal (e.g., `http://localhost:5173`). The UI will connect to the backend server running on port 8080.

### 🧪 Testing

The project includes a comprehensive test suite.

-   **Run Backend Tests (Jest):**
    From the project root:
    ```bash
    npm test
    ```

-   **Run UI Tests (Vitest):**
    From the `ui` directory:
    ```bash
    npm run test
    ```

### 🧩 Extensibility

`mcr3` is designed to be extensible. The most common extension is adding a new LLM provider.

#### Adding a New LLM Provider

To add support for a new provider (e.g., "MyNewLLM"):

1.  **Create the Provider Module**:
    -   Add a new file: `src/llm/providers/myNewLlmProvider.js`.
    -   This module must implement the `ILlmProvider` interface, exporting an object with a `generate` function. The `generate` function takes `(systemPrompt, userPrompt, options)` and returns the generated text.

    ```javascript
    // src/llm/providers/myNewLlmProvider.js
    import { ILlmProvider } from '../../interfaces/ILlmProvider.js';
    import { MyApiClient } from 'my-llm-sdk'; // Hypothetical SDK

    class MyNewLlmProvider extends ILlmProvider {
      constructor(config) {
        super();
        this.client = new MyApiClient({ apiKey: config.apiKey });
        this.model = config.model;
      }

      async generate(systemPrompt, userPrompt, options = {}) {
        const fullPrompt = `${systemPrompt}\\n\\n${userPrompt}`;
        const response = await this.client.generate(fullPrompt, {
          model: this.model,
          ...options,
        });
        return response.text;
      }
    }

    export default MyNewLlmProvider;
    ```

2.  **Register in `llmService.js`**:
    -   In `src/llmService.js`, import your new provider class.
    -   Add a `case` for your provider's name in the factory function or map that selects the provider based on the configuration.

    ```javascript
    // In src/llmService.js
    import MyNewLlmProvider from './providers/myNewLlmProvider.js';

    // In the provider factory...
    switch (providerName) {
      // ... other cases
      case 'mynewllm':
        return new MyNewLlmProvider(config.llm.mynewllm);
      default:
        throw new Error(`Unsupported LLM provider: ${providerName}`);
    }
    ```

3.  **Update Configuration**:
    -   Add a section for your provider's configuration in `src/config.js`.
    -   Add the corresponding environment variables to `.env.example`.

    ```dotenv
    # In .env.example
    # --- MyNewLLM Configuration ---
    # MCR_LLM_PROVIDER="mynewllm"
    # MYNEWLLM_API_KEY="key-..."
    # MCR_LLM_MODEL_MYNEWLLM="default-model"
    ```
