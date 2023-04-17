import { BaseLanguageModel } from "../../base_language/index.js";
import { LLMChain } from "../../chains/llm_chain.js";
import { PromptTemplate } from "../../prompts/prompt.js";
import { renderTemplate } from "../../prompts/template.js";
import { Tool } from "../../tools/base.js";
import { Optional } from "../../util/type-utils.js";
import { Agent, AgentArgs } from "../agent.js";
import { deserializeHelper } from "../helpers.js";
import {
  AgentInput,
  SerializedFromLLMAndTools,
  SerializedZeroShotAgent,
} from "../types.js";
import { ZeroShotAgentOutputParser } from "./outputParser.js";
import { FORMAT_INSTRUCTIONS, PREFIX, SUFFIX } from "./prompt.js";

export const FINAL_ANSWER_ACTION = "Final Answer:";

export type CreatePromptArgs = {
  /** String to put after the list of tools. */
  suffix?: string;
  /** String to put before the list of tools. */
  prefix?: string;
  /** List of input variables the final prompt will expect. */
  inputVariables?: string[];
};

type ZeroShotAgentInput = Optional<AgentInput, "outputParser">;

/**
 * Agent for the MRKL chain.
 * @augments Agent
 */
export class ZeroShotAgent extends Agent {
  constructor(input: ZeroShotAgentInput) {
    const outputParser =
      input?.outputParser ?? ZeroShotAgent.getDefaultOutputParser();
    super({ ...input, outputParser });
  }

  _agentType() {
    return "zero-shot-react-description" as const;
  }

  observationPrefix() {
    return "Observation: ";
  }

  llmPrefix() {
    return "Thought:";
  }

  static getDefaultOutputParser() {
    return new ZeroShotAgentOutputParser();
  }

  static validateTools(tools: Tool[]) {
    const invalidTool = tools.find((tool) => !tool.description);
    if (invalidTool) {
      const msg =
        `Got a tool ${invalidTool.name} without a description.` +
        ` This agent requires descriptions for all tools.`;
      throw new Error(msg);
    }
  }

  /**
   * Create prompt in the style of the zero shot agent.
   *
   * @param tools - List of tools the agent will have access to, used to format the prompt.
   * @param args - Arguments to create the prompt with.
   * @param args.suffix - String to put after the list of tools.
   * @param args.prefix - String to put before the list of tools.
   * @param args.inputVariables - List of input variables the final prompt will expect.
   */
  static createPrompt(tools: Tool[], args?: CreatePromptArgs) {
    const {
      prefix = PREFIX,
      suffix = SUFFIX,
      inputVariables = ["input", "agent_scratchpad"],
    } = args ?? {};
    const toolStrings = tools
      .map((tool) => `${tool.name}: ${tool.description}`)
      .join("\n");

    const toolNames = tools.map((tool) => tool.name);

    const formatInstructions = renderTemplate(FORMAT_INSTRUCTIONS, "f-string", {
      tool_names: toolNames,
    });

    const template = [prefix, toolStrings, formatInstructions, suffix].join(
      "\n\n"
    );

    return new PromptTemplate({
      template,
      inputVariables,
    });
  }

  static fromLLMAndTools(
    llm: BaseLanguageModel,
    tools: Tool[],
    args?: CreatePromptArgs & AgentArgs
  ) {
    ZeroShotAgent.validateTools(tools);
    const prompt = ZeroShotAgent.createPrompt(tools, args);
    const outputParser =
      args?.outputParser ?? ZeroShotAgent.getDefaultOutputParser();
    const chain = new LLMChain({
      prompt,
      llm,
      callbackManager: args?.callbackManager,
    });

    return new ZeroShotAgent({
      llmChain: chain,
      allowedTools: tools.map((t) => t.name),
      outputParser,
    });
  }

  async extractToolAndInput(
    text: string
  ): Promise<{ tool: string; input: string } | null> {
    if (text.includes(FINAL_ANSWER_ACTION)) {
      const parts = text.split(FINAL_ANSWER_ACTION);
      const input = parts[parts.length - 1].trim();
      return { tool: "Final Answer", input };
    }

    const match = /Action: (.*)\nAction Input: (.*)/s.exec(text);
    if (!match) {
      throw new Error(`Could not parse LLM output: ${text}`);
    }

    return {
      tool: match[1].trim(),
      input: match[2].trim().replace(/^"+|"+$/g, ""),
    };
  }

  static async deserialize(
    data: SerializedZeroShotAgent & { llm?: BaseLanguageModel; tools?: Tool[] }
  ): Promise<ZeroShotAgent> {
    const { llm, tools, ...rest } = data;
    return deserializeHelper(
      llm,
      tools,
      rest,
      (
        llm: BaseLanguageModel,
        tools: Tool[],
        args: SerializedFromLLMAndTools
      ) =>
        ZeroShotAgent.fromLLMAndTools(llm, tools, {
          prefix: args.prefix,
          suffix: args.suffix,
          inputVariables: args.input_variables,
        }),
      (args) => new ZeroShotAgent(args)
    );
  }
}
