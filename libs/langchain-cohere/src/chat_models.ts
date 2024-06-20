import { CohereClient, Cohere } from "cohere-ai";

import {
  MessageType,
  type BaseMessage,
  MessageContent,
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { type BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  type BaseChatModelParams,
  BaseChatModel,
  LangSmithParams,
} from "@langchain/core/language_models/chat_models";
import {
  ChatGeneration,
  ChatGenerationChunk,
  ChatResult,
} from "@langchain/core/outputs";
import { AIMessageChunk } from "@langchain/core/messages";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { NewTokenIndices } from "@langchain/core/callbacks/base";
import { ToolResult } from "cohere-ai/api/index.js";
import { ToolMessage, ToolCall, ToolCallChunk } from "@langchain/core/messages/tool";
import * as uuid from "uuid";

/**
 * Input interface for ChatCohere
 */
export interface ChatCohereInput extends BaseChatModelParams {
  /**
   * The API key to use.
   * @default {process.env.COHERE_API_KEY}
   */
  apiKey?: string;
  /**
   * The name of the model to use.
   * @default {"command"}
   */
  model?: string;
  /**
   * What sampling temperature to use, between 0.0 and 2.0.
   * Higher values like 0.8 will make the output more random,
   * while lower values like 0.2 will make it more focused
   * and deterministic.
   * @default {0.3}
   */
  temperature?: number;
  /**
   * Whether or not to stream the response.
   * @default {false}
   */
  streaming?: boolean;
  /**
   * Whether or not to include token usage when streaming.
   * This will include an extra chunk at the end of the stream
   * with `eventType: "stream-end"` and the token usage in
   * `usage_metadata`.
   * @default {true}
   */
  streamUsage?: boolean;
}

interface TokenUsage {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
}

export interface CohereChatCallOptions
  extends BaseLanguageModelCallOptions,
    Partial<Omit<Cohere.ChatRequest, "message">>,
    Partial<Omit<Cohere.ChatStreamRequest, "message">>,
    Pick<ChatCohereInput, "streamUsage"> {}

    function convertToDocuments(
      observations: any
  ): Array<Record<string, any>> {
      /** Converts observations into a 'document' dict */
      let documents: Array<Record<string, any>> = [];
      
      if (typeof observations === 'string') {
          // strings are turned into a key/value pair and a key of 'output' is added.
          observations = [{ output: observations }];
      } else if (observations instanceof Map || typeof observations === 'object' && observations !== null && !Array.isArray(observations)) {
          // single mappings are transformed into a list to simplify the rest of the code.
          observations = [observations];
      } else if (!Array.isArray(observations)) {
          // all other types are turned into a key/value pair within a list
          observations = [{ output: observations }];
      }
  
      for (let doc of observations) {
          if (!(doc instanceof Map) && (typeof doc !== 'object' || doc === null)) {
              // types that aren't Mapping are turned into a key/value pair.
              doc = { output: doc };
          }
          documents.push(doc);
      }
  
      return documents;
  }

function convertMessageToCohereMessage(
  message: BaseMessage,
  toolResults: ToolResult[],
): Cohere.Message {
  const getRole = (role: MessageType) => {
    switch (role) {
      case "system":
        return "SYSTEM";
      case "human":
        return "USER";
      case "ai":
        return "CHATBOT";
      case "tool":
        return "TOOL";
      default:
        throw new Error(
          `Unknown message type: '${role}'. Accepted types: 'human', 'ai', 'system', 'tool'`
        );
    }
  };

  const getContent = (content: MessageContent): string => {
    if (typeof content === "string") {
      return content;
    }
    throw new Error(
      `ChatCohere does not support non text message content. Received: ${JSON.stringify(
        content,
        null,
        2
      )}`
    );
  };

  const getToolCall = (message: BaseMessage): Cohere.ToolCall[] => {
    if (message instanceof AIMessage && message.tool_calls) { 
      return message.tool_calls.map((toolCall) => ({name: toolCall.name, parameters: toolCall.args}));
    }
    return [];
  }

  if (message instanceof AIMessage) {
    return {
      role: getRole(message._getType()),
      message: getContent(message.content),
      toolCalls: getToolCall(message),
    };
  } else if (message instanceof ToolMessage) {
    return {
      role: getRole(message._getType()),
      message: getContent(message.content),
      toolResults: toolResults
    };
  } else if ((message instanceof HumanMessage) || (message instanceof SystemMessage)) {
    return {
      role: getRole(message._getType()),
      message: getContent(message.content),
    };
  } else {
    throw new Error(
      "Got unknown message type. Supported types are AIMessage, ToolMessage, HumanMessage, and SystemMessage"
    );
  }
};

/**
 * Integration with ChatCohere
 * @example
 * ```typescript
 * const model = new ChatCohere({
 *   apiKey: process.env.COHERE_API_KEY, // Default
 *   model: "command" // Default
 * });
 * const response = await model.invoke([
 *   new HumanMessage("How tall are the largest pengiuns?")
 * ]);
 * ```
 */
export class ChatCohere<
    CallOptions extends CohereChatCallOptions = CohereChatCallOptions
  >
  extends BaseChatModel<CallOptions, AIMessageChunk>
  implements ChatCohereInput
{
  static lc_name() {
    return "ChatCohere";
  }

  lc_serializable = true;

  client: CohereClient;

  model = "command-r-plus";

  temperature = 0.3;

  streaming = false;

  streamUsage: boolean = true;

  constructor(fields?: ChatCohereInput) {
    super(fields ?? {});

    const token = fields?.apiKey ?? getEnvironmentVariable("COHERE_API_KEY");
    if (!token) {
      throw new Error("No API key provided for ChatCohere.");
    }

    this.client = new CohereClient({
      token,
    });
    this.model = fields?.model ?? this.model;
    this.temperature = fields?.temperature ?? this.temperature;
    this.streaming = fields?.streaming ?? this.streaming;
    this.streamUsage = fields?.streamUsage ?? this.streamUsage;
  }

  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams {
    const params = this.invocationParams(options);
    return {
      ls_provider: "cohere",
      ls_model_name: this.model,
      ls_model_type: "chat",
      ls_temperature: this.temperature ?? undefined,
      ls_max_tokens:
        typeof params.maxTokens === "number" ? params.maxTokens : undefined,
      ls_stop: Array.isArray(params.stopSequences)
        ? (params.stopSequences as unknown as string[])
        : undefined,
    };
  }

  _llmType() {
    return "cohere";
  }

  invocationParams(options: this["ParsedCallOptions"]) {
    const params = {
      model: this.model,
      preamble: options.preamble,
      conversationId: options.conversationId,
      promptTruncation: options.promptTruncation,
      connectors: options.connectors,
      searchQueriesOnly: options.searchQueriesOnly,
      documents: options.documents,
      temperature: options.temperature ?? this.temperature,
      forceSingleStep: options.forceSingleStep,
      tools: options.tools,
    };
    // Filter undefined entries
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined)
    );
  }

    /** @ignore */
  getChatRequest(messages: BaseMessage[],
    options: this["ParsedCallOptions"]): Cohere.ChatRequest {

      const params = this.invocationParams(options);
      
      let toolResults = this.messagesToCohereToolResultsCurrChatTurn(messages);
      let chatHistory = []
      let messageStr: string = ""
      let tempToolResults:   {
        call: Cohere.ToolCall;
        outputs: any;
    }[] = []

      if (!params.forceSingleStep) {
        for (let i = 0; i < messages.length - 1; i++) {
            const message = messages[i];
            // If there are multiple tool messages, then we need to aggregate them into one single tool message to pass into chat history
            if (message instanceof ToolMessage) {
              tempToolResults = tempToolResults.concat(this.messageToCohereToolResults(messages, i));
    
                if ((i === messages.length - 1) || !(messages[i + 1] instanceof ToolMessage)) {
                    const cohere_message = convertMessageToCohereMessage(message, tempToolResults);
                    chatHistory.push(cohere_message);
                    tempToolResults = [];
                }
            } else {
              chatHistory.push(convertMessageToCohereMessage(message, []));
            }
        }
    
        messageStr = toolResults.length > 0 ? "" : messages[messages.length - 1].content.toString();
    }
    
    
     else {
      messageStr = "";

      // if force_single_step is set to True, then message is the last human message in the conversation
      for (let i = 0; i < messages.length - 1; i++) {
          let message = messages[i];
          if (message instanceof AIMessage && message.tool_calls) {
              continue;
          }
      
          // If there are multiple tool messages, then we need to aggregate them into one single tool message to pass into chat history
          if (message instanceof ToolMessage) {
              tempToolResults = tempToolResults.concat(this.messageToCohereToolResults(messages, i));
      
              if ((i === messages.length - 1) || !(messages[i + 1] instanceof ToolMessage)) {
                  let cohereMessage = convertMessageToCohereMessage(message, tempToolResults);
                  chatHistory.push(cohereMessage);
                  tempToolResults = [];
              }
          } else {
              chatHistory.push(convertMessageToCohereMessage(message, []));
          }
      }
      
      // Add the last human message in the conversation to the message string
      for (let i = messages.length - 1; i >= 0; i--) {
          let message = messages[i];
          if (message instanceof HumanMessage && message.content) {
              messageStr = message.content.toString();
              break;
          }
      }
      }
        const req: Cohere.ChatRequest = {
          message: messageStr,
          chatHistory: chatHistory,
          toolResults: toolResults.length > 0 ? toolResults : undefined,
          ...params,
      };
      
      return req;
    }

    getCurrChatTurnMessages(messages: BaseMessage[]): BaseMessage[] {
      // Get the messages for the current chat turn.
      const currentChatTurnMessages: BaseMessage[] = [];
      for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          currentChatTurnMessages.push(message);
          if (message instanceof HumanMessage) {
              break;
          }
      }
      return currentChatTurnMessages.reverse();
  }

  messagesToCohereToolResultsCurrChatTurn(
    messages: BaseMessage[]
): Array<{ call: Cohere.ToolCall, outputs: ReturnType<typeof convertToDocuments> }> {
    /** Get tool_results from messages. */
    const toolResults: Array<{ call: Cohere.ToolCall, outputs: ReturnType<typeof convertToDocuments> }> = [];
    const currChatTurnMessages = this.getCurrChatTurnMessages(messages);

    for (const message of currChatTurnMessages) {
        if (message instanceof ToolMessage) {
            const toolMessage = message;
            const previousAiMsgs = currChatTurnMessages.filter(
                (msg) => msg instanceof AIMessage && msg.tool_calls !== undefined
            ) as AIMessage[];
            if (previousAiMsgs.length > 0) {
                const previousAiMsg = previousAiMsgs[previousAiMsgs.length - 1];
                if (previousAiMsg.tool_calls) {
                toolResults.push(
                    ...previousAiMsg.tool_calls
                        .filter((lcToolCall) => lcToolCall.id === toolMessage.tool_call_id)
                        .map((lcToolCall) => ({
                            call: {
                                name: lcToolCall.name,
                                parameters: lcToolCall.args
                        },
                            outputs: convertToDocuments(toolMessage.content),
                        }))
                );
              }
            }
        }
    }
    return toolResults;
}

messageToCohereToolResults(
  messages: BaseMessage[], toolMessageIndex: number
): Array<{ call: Cohere.ToolCall, outputs: any }> {
  /** Get tool_results from messages. */
  const toolResults: Array<{ call: Cohere.ToolCall, outputs: any }> = [];
  const toolMessage = messages[toolMessageIndex];
  
  if (!(toolMessage instanceof ToolMessage)) {
      throw new Error("The message index does not correspond to an instance of ToolMessage");
  }

  const messagesUntilTool = messages.slice(0, toolMessageIndex);
  const previousAiMessage = messagesUntilTool
      .filter(message => message instanceof AIMessage && message.tool_calls)
      .slice(-1)[0] as AIMessage;

  if (previousAiMessage.tool_calls) {
    toolResults.push(
        ...previousAiMessage.tool_calls
            .filter(lcToolCall => lcToolCall["id"] === toolMessage.tool_call_id)
            .map(lcToolCall => ({
                call: {
                    name: lcToolCall["name"],
                    parameters: lcToolCall["args"],
                },
                outputs: convertToDocuments(toolMessage.content),
            }))
  )};

  return toolResults;
}
  formatCohereToolCalls(toolCalls: Cohere.ToolCall[] | null = null): {id: string, function: {name: string, arguments: Record<string, any>}, type: string}[] {
  if (!toolCalls) {
      return [];
  }

    const formattedToolCalls = [];
    for (const toolCall of toolCalls) {
      formattedToolCalls.push({
        id: uuid.v4().substring(0, 32),
        function: {
          name: toolCall.name,
          arguments: toolCall.parameters, // Convert arguments to string
        },
        type: "function",
      });
    }
    return formattedToolCalls;
}

convertCohereToolCallToLangchain(toolCalls: Record<string, any>[]): ToolCall[] {
  return toolCalls.map(toolCall => ({name: toolCall.function.name, args: toolCall.function.arguments, id: toolCall.id}));
}


  /** @ignore */
  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const tokenUsage: TokenUsage = {};
    // The last message in the array is the most recent, all other messages
    // are apart of the chat history.
    const request = this.getChatRequest(messages,options)

    // Handle streaming
    if (this.streaming) {
      const stream = this._streamResponseChunks(messages, options, runManager);
      const finalChunks: Record<number, ChatGenerationChunk> = {};
      for await (const chunk of stream) {
        const index =
          (chunk.generationInfo as NewTokenIndices)?.completion ?? 0;
        if (finalChunks[index] === undefined) {
          finalChunks[index] = chunk;
        } else {
          finalChunks[index] = finalChunks[index].concat(chunk);
        }
      }
      const generations = Object.entries(finalChunks)
        .sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10))
        .map(([_, value]) => value);

      return { generations, llmOutput: { estimatedTokenUsage: tokenUsage } };
    }

    // Not streaming, so we can just call the API once.
    const response: Cohere.NonStreamedChatResponse =
      await this.caller.callWithOptions(
        { signal: options.signal },
        async () => {
          let response;
          try {
            response = await this.client.chat(request);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            e.status = e.status ?? e.statusCode;
            throw e;
          }
          return response;
        }
      );

    if (response.meta?.tokens) {
      const { inputTokens, outputTokens } = response.meta.tokens;

      if (outputTokens) {
        tokenUsage.completionTokens =
          (tokenUsage.completionTokens ?? 0) + outputTokens;
      }

      if (inputTokens) {
        tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + inputTokens;
      }

      tokenUsage.totalTokens =
        (tokenUsage.totalTokens ?? 0) +
        (tokenUsage.promptTokens ?? 0) +
        (tokenUsage.completionTokens ?? 0);
    }

    let generationInfo: Record<string, unknown> = { ...response };
    delete generationInfo.text;
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Only populate tool_calls when 1) present on the response and
      // 2) has one or more calls.
      generationInfo.toolCalls = this.formatCohereToolCalls(response.toolCalls);
  }
  let toolCalls: ToolCall[] = [];
  if ("toolCalls" in generationInfo) {
    toolCalls = this.convertCohereToolCallToLangchain(generationInfo.toolCalls as Record<string, any>[]);

  }

    const generations: ChatGeneration[] = [
      {
        text: response.text,
        message: new AIMessage({
          content: response.text,
          additional_kwargs: generationInfo,
          tool_calls: toolCalls,
          usage_metadata: {
            input_tokens: tokenUsage.promptTokens ?? 0,
            output_tokens: tokenUsage.completionTokens ?? 0,
            total_tokens: tokenUsage.totalTokens ?? 0,
          },
        }),
        generationInfo,
      },
    ];
    return {
      generations,
      llmOutput: { estimatedTokenUsage: tokenUsage },
    };
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const request = this.getChatRequest(messages,options)

    // All models have a built in `this.caller` property for retries
    const stream = await this.caller.call(async () => {
      let stream;
      try {
        stream = await this.client.chatStream(request);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        e.status = e.status ?? e.statusCode;
        throw e;
      }
      return stream;
    });
    for await (const chunk of stream) {
      if (chunk.eventType === "text-generation") {
        yield new ChatGenerationChunk({
          text: chunk.text,
          message: new AIMessageChunk({
            content: chunk.text,
          }),
        });
        await runManager?.handleLLMNewToken(chunk.text);
      } else if (chunk.eventType !== "stream-end") {
        // Used for when the user uses their RAG/Search/other API
        // and the stream takes more actions then just text generation.
        yield new ChatGenerationChunk({
          text: "",
          message: new AIMessageChunk({
            content: "",
            additional_kwargs: {
              ...chunk,
            },
          }),
          generationInfo: {
            ...chunk,
          },
        });
      } else if (
        chunk.eventType === "stream-end" &&
        (this.streamUsage || options.streamUsage)
      ) {
        // stream-end events contain the final token count
        const input_tokens = chunk.response.meta?.tokens?.inputTokens ?? 0;
        const output_tokens = chunk.response.meta?.tokens?.outputTokens ?? 0;
        let chunkGenerationInfo: Record<string, any> = { ...chunk.response };

        if (chunk.response.toolCalls && chunk.response.toolCalls.length > 0) {
          // Only populate tool_calls when 1) present on the response and
          // 2) has one or more calls.
          chunkGenerationInfo.toolCalls = this.formatCohereToolCalls(chunk.response.toolCalls);
      }

      let toolCallChunks: ToolCallChunk[] = [];
      let toolCalls = chunkGenerationInfo.toolCalls ?? [];

      if (toolCalls.length > 0) {
          toolCallChunks = toolCalls.map((toolCall: any) => ({
              name: toolCall["function"]["name"],
              args: toolCall["function"]["arguments"],
              id: toolCall["id"],
              index: toolCall["index"]
          }));
      }

        yield new ChatGenerationChunk({
          text: "",
          message: new AIMessageChunk({
            content: "",
            additional_kwargs: {
              eventType: "stream-end",
            },
            tool_call_chunks: toolCallChunks,
            usage_metadata: {
              input_tokens,
              output_tokens,
              total_tokens: input_tokens + output_tokens,
            },
          }),
          generationInfo: {
            eventType: "stream-end",
            ...chunkGenerationInfo,
          },
        });
      }
    }
  }

  /** @ignore */
  _combineLLMOutput(...llmOutputs: CohereLLMOutput[]): CohereLLMOutput {
    return llmOutputs.reduce<{
      [key in keyof CohereLLMOutput]: Required<CohereLLMOutput[key]>;
    }>(
      (acc, llmOutput) => {
        if (llmOutput && llmOutput.estimatedTokenUsage) {
          let completionTokens = acc.estimatedTokenUsage?.completionTokens ?? 0;
          let promptTokens = acc.estimatedTokenUsage?.promptTokens ?? 0;
          let totalTokens = acc.estimatedTokenUsage?.totalTokens ?? 0;

          completionTokens +=
            llmOutput.estimatedTokenUsage.completionTokens ?? 0;
          promptTokens += llmOutput.estimatedTokenUsage.promptTokens ?? 0;
          totalTokens += llmOutput.estimatedTokenUsage.totalTokens ?? 0;

          acc.estimatedTokenUsage = {
            completionTokens,
            promptTokens,
            totalTokens,
          };
        }
        return acc;
      },
      {
        estimatedTokenUsage: {
          completionTokens: 0,
          promptTokens: 0,
          totalTokens: 0,
        },
      }
    );
  }

  get lc_secrets(): { [key: string]: string } | undefined {
    return {
      apiKey: "COHERE_API_KEY",
      api_key: "COHERE_API_KEY",
    };
  }

  get lc_aliases(): { [key: string]: string } | undefined {
    return {
      apiKey: "cohere_api_key",
      api_key: "cohere_api_key",
    };
  }
}

interface CohereLLMOutput {
  estimatedTokenUsage?: TokenUsage;
}
