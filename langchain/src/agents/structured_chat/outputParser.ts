import { AgentActionOutputParser } from "../types.js";
import {
  AGENT_ACTION_FORMAT_INSTRUCTIONS,
  FORMAT_INSTRUCTIONS,
} from "./prompt.js";
import { OutputFixingParser } from "../../output_parsers/fix.js";
import { BaseLanguageModel } from "../../base_language/index.js";
import { AgentAction, AgentFinish } from "../../schema/index.js";
import { OutputParserException } from "../../schema/output_parser.js";
import { renderTemplate } from "../../prompts/index.js";
import { Callbacks } from "../../callbacks/manager.js";

/**
 * A class that provides a custom implementation for parsing the output of
 * a StructuredChatAgent action. It extends the `AgentActionOutputParser`
 * class and extracts the action and action input from the text output,
 * returning an `AgentAction` or `AgentFinish` object.
 */
export class StructuredChatOutputParser extends AgentActionOutputParser {
  lc_namespace = ["langchain", "agents", "structured_chat"];

  private toolNames: string[];

  constructor(fields: { toolNames: string[] }) {
    super(...arguments);
    this.toolNames = fields.toolNames;
  }

  /**
   * Parses the given text and returns an `AgentAction` or `AgentFinish`
   * object. If an `OutputFixingParser` is provided, it is used for parsing;
   * otherwise, the base parser is used.
   * @param text The text to parse.
   * @param callbacks Optional callbacks for asynchronous operations.
   * @returns A Promise that resolves to an `AgentAction` or `AgentFinish` object.
   */
  async parse(text: string): Promise<AgentAction | AgentFinish> {
    try {
      const regex = /.*```json\s*(?<response>[\s\S]*?)```\s*(?![\s\S]*```)/s;
      const actionMatch = regex.exec(text);

      // Let's shortcut early here. If we weren't able to extract `response`,
      // there's no point in continuing.
      if (actionMatch?.groups?.response === undefined) {
        throw new OutputParserException(
          `Could not parse an action. The agent action must be within a markdown code block, and "action" must be a provided tool or "Final Answer"`
        );
      }

      const response = JSON.parse(actionMatch.groups.response.trim());
      const { action, action_input } = response;

      if (action === "Final Answer") {
        return { returnValues: { output: action_input }, log: text };
      }

      return { tool: action, toolInput: action_input || {}, log: text };
    } catch (e) {
      throw new OutputParserException(
        `Failed to parse. Text: \n\n${text}\n\n Error: ${e}`
      );
    }
  }

  /**
   * Returns the format instructions for parsing the output of an agent
   * action in the style of the StructuredChatAgent.
   * @returns A string representing the format instructions.
   */
  getFormatInstructions(): string {
    return renderTemplate(AGENT_ACTION_FORMAT_INSTRUCTIONS, "f-string", {
      tool_names: this.toolNames.join(", "),
    });
  }
}

/**
 * An interface for the arguments used to construct a
 * `StructuredChatOutputParserWithRetries` instance.
 */
export interface StructuredChatOutputParserArgs {
  baseParser?: StructuredChatOutputParser;
  outputFixingParser?: OutputFixingParser<AgentAction | AgentFinish>;
  toolNames?: string[];
}

/**
 * A class that provides a wrapper around the `StructuredChatOutputParser`
 * and `OutputFixingParser` classes. It extends the
 * `AgentActionOutputParser` class and allows for retrying the output
 * parsing using the `OutputFixingParser` if it is provided.
 */
export class StructuredChatOutputParserWithRetries extends AgentActionOutputParser {
  lc_namespace = ["langchain", "agents", "structured_chat"];

  private baseParser: StructuredChatOutputParser;

  private outputFixingParser?: OutputFixingParser<AgentAction | AgentFinish>;

  private toolNames: string[] = [];

  constructor(fields: StructuredChatOutputParserArgs) {
    super(fields);
    this.toolNames = fields.toolNames ?? this.toolNames;
    this.baseParser =
      fields?.baseParser ??
      new StructuredChatOutputParser({ toolNames: this.toolNames });
    this.outputFixingParser = fields?.outputFixingParser;
  }

  /**
   * Parses the given text and returns an `AgentAction` or `AgentFinish`
   * object. Throws an `OutputParserException` if the parsing fails.
   * @param text The text to parse.
   * @returns A Promise that resolves to an `AgentAction` or `AgentFinish` object.
   */
  async parse(
    text: string,
    callbacks?: Callbacks
  ): Promise<AgentAction | AgentFinish> {
    if (this.outputFixingParser !== undefined) {
      return this.outputFixingParser.parse(text, callbacks);
    }
    return this.baseParser.parse(text);
  }

  /**
   * Returns the format instructions for parsing the output of an agent
   * action in the style of the StructuredChatAgent.
   * @returns A string representing the format instructions.
   */
  getFormatInstructions(): string {
    return renderTemplate(FORMAT_INSTRUCTIONS, "f-string", {
      tool_names: this.toolNames.join(", "),
    });
  }

  /**
   * Creates a new `StructuredChatOutputParserWithRetries` instance from a
   * `BaseLanguageModel` and options. The options can include a base parser
   * and tool names.
   * @param llm A `BaseLanguageModel` instance.
   * @param options Options for creating a `StructuredChatOutputParserWithRetries` instance.
   * @returns A new `StructuredChatOutputParserWithRetries` instance.
   */
  static fromLLM(
    llm: BaseLanguageModel,
    options: Omit<StructuredChatOutputParserArgs, "outputFixingParser">
  ): StructuredChatOutputParserWithRetries {
    const baseParser =
      options.baseParser ??
      new StructuredChatOutputParser({ toolNames: options.toolNames ?? [] });
    const outputFixingParser = OutputFixingParser.fromLLM(llm, baseParser);
    return new StructuredChatOutputParserWithRetries({
      baseParser,
      outputFixingParser,
      toolNames: options.toolNames,
    });
  }
}
