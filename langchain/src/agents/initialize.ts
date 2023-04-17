import { Tool } from "../tools/base.js";
import { AgentExecutor } from "./executor.js";
import { ZeroShotAgent } from "./mrkl/index.js";
import { ChatConversationalAgent } from "./chat_convo/index.js";
import { ChatAgent } from "./chat/index.js";
import { BaseLanguageModel } from "../base_language/index.js";
import { CallbackManager, getCallbackManager } from "../callbacks/index.js";
import { BaseMemory, BufferMemory } from "../memory/index.js";

type AgentType =
  | "zero-shot-react-description"
  | "chat-zero-shot-react-description"
  | "chat-conversational-react-description";

export const initializeAgentExecutor = async (
  tools: Tool[],
  llm: BaseLanguageModel,
  _agentType?: AgentType,
  _verbose?: boolean,
  _callbackManager?: CallbackManager
): Promise<AgentExecutor> => {
  const agentType = _agentType ?? "zero-shot-react-description";
  const verbose = _verbose ?? !!_callbackManager;
  const callbackManager = _callbackManager ?? getCallbackManager();
  switch (agentType) {
    case "zero-shot-react-description":
      return AgentExecutor.fromAgentAndTools({
        agent: ZeroShotAgent.fromLLMAndTools(llm, tools),
        tools,
        returnIntermediateSteps: true,
        verbose,
        callbackManager,
      });
    case "chat-zero-shot-react-description":
      return AgentExecutor.fromAgentAndTools({
        agent: ChatAgent.fromLLMAndTools(llm, tools),
        tools,
        returnIntermediateSteps: true,
        verbose,
        callbackManager,
      });
    case "chat-conversational-react-description":
      return AgentExecutor.fromAgentAndTools({
        agent: ChatConversationalAgent.fromLLMAndTools(llm, tools),
        tools,
        verbose,
        callbackManager,
      });
    default:
      throw new Error("Unknown agent type");
  }
};

export const initializeAgentExecutorWithOptions = async (
  tools: Tool[],
  llm: BaseLanguageModel,
  options: {
    agentType?: AgentType;
    promptArgs?: object;
    memory?: BaseMemory;
    returnIntermediateSteps?: boolean;
    verbose?: boolean;
    callbackManager?: CallbackManager;
  }
): Promise<AgentExecutor> => {
  const agentType = options.agentType ?? "zero-shot-react-description";
  const returnIntermediateSteps = options.returnIntermediateSteps ?? false;
  const verbose = options.verbose ?? false;
  const callbackManager = options.callbackManager ?? getCallbackManager();

  switch (agentType) {
    case "zero-shot-react-description": {
      if (options.memory) {
        throw new Error(
          `The "memory" option is only supported for executors with agentType "chat-conversational-react-description".`
        );
      }
      return AgentExecutor.fromAgentAndTools({
        agent: ZeroShotAgent.fromLLMAndTools(
          llm,
          tools,
          options.promptArgs ?? {}
        ),
        tools,
        returnIntermediateSteps,
        verbose,
        callbackManager,
      });
    }
    case "chat-zero-shot-react-description": {
      if (options.memory) {
        throw new Error(
          `The "memory" option is only supported for executors with agentType "chat-conversational-react-description".`
        );
      }
      return AgentExecutor.fromAgentAndTools({
        agent: ChatAgent.fromLLMAndTools(llm, tools, options.promptArgs ?? {}),
        tools,
        returnIntermediateSteps,
        verbose,
        callbackManager,
      });
    }
    case "chat-conversational-react-description": {
      const executor = AgentExecutor.fromAgentAndTools({
        agent: ChatConversationalAgent.fromLLMAndTools(
          llm,
          tools,
          options.promptArgs ?? {}
        ),
        tools,
        returnIntermediateSteps,
        verbose,
        callbackManager,
        memory:
          options.memory ??
          new BufferMemory({
            returnMessages: true,
            memoryKey: "chat_history",
            inputKey: "input",
          }),
      });
      return executor;
    }
    default: {
      throw new Error("Unknown agent type");
    }
  }
};
