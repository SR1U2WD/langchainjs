import {
  AIChatMessage,
  BaseChatMessage,
  BasePromptValue,
  ChatGeneration,
  ChatResult,
  LLMResult,
} from "../schema/index.js";
import {
  BaseLanguageModel,
  BaseLanguageModelParams,
} from "../base_language/index.js";
import { getBufferString } from "../memory/base.js";
import {
  CallbackManager,
  CallbackManagerForLLMRun,
} from "../callbacks/manager.js";
import { BaseCallbackHandler } from "../callbacks/base.js";

export type SerializedChatModel = {
  _model: string;
  _type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & Record<string, any>;

// todo?
export type SerializedLLM = {
  _model: string;
  _type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & Record<string, any>;

export type BaseChatModelParams = BaseLanguageModelParams;

export abstract class BaseChatModel extends BaseLanguageModel {
  constructor(fields: BaseChatModelParams) {
    super(fields);
  }

  abstract _combineLLMOutput?(
    ...llmOutputs: LLMResult["llmOutput"][]
  ): LLMResult["llmOutput"];

  async generate(
    messages: BaseChatMessage[][],
    stop?: string[],
    callbacks?: CallbackManager | BaseCallbackHandler[]
  ): Promise<LLMResult> {
    const generations: ChatGeneration[][] = [];
    const llmOutputs: LLMResult["llmOutput"][] = [];
    const messageStrings: string[] = messages.map((messageList) =>
      getBufferString(messageList)
    );
    const callbackManager_ = await CallbackManager.configure(
      Array.isArray(callbacks) ? callbacks : callbacks?.handlers,
      this.callbackHandlers ?? this.callbackManager?.handlers
    );
    const runManager = await callbackManager_?.handleLLMStart(
      { name: this._llmType() },
      messageStrings
    );
    try {
      for (const message of messages) {
        const result = await this._generate(message, stop, runManager);
        if (result.llmOutput) {
          llmOutputs.push(result.llmOutput);
        }
        generations.push(result.generations);
      }
    } catch (err) {
      await runManager?.handleLLMError(err);
      throw err;
    }

    const output: LLMResult = {
      generations,
      llmOutput: llmOutputs.length
        ? this._combineLLMOutput?.(...llmOutputs)
        : undefined,
    };
    await runManager?.handleLLMEnd(output);
    output.__runMetadata = runManager
      ? { runId: runManager?.runId }
      : undefined;
    return output;
  }

  _modelType(): string {
    return "base_chat_model" as const;
  }

  abstract _llmType(): string;

  async generatePrompt(
    promptValues: BasePromptValue[],
    stop?: string[],
    callbacks?: CallbackManager | BaseCallbackHandler[]
  ): Promise<LLMResult> {
    const promptMessages: BaseChatMessage[][] = promptValues.map(
      (promptValue) => promptValue.toChatMessages()
    );
    return this.generate(promptMessages, stop, callbacks);
  }

  abstract _generate(
    messages: BaseChatMessage[],
    stop?: string[],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult>;

  async call(
    messages: BaseChatMessage[],
    stop?: string[],
    callbacks?: CallbackManager | BaseCallbackHandler[]
  ): Promise<BaseChatMessage> {
    const result = await this.generate([messages], stop, callbacks);
    const generations = result.generations as ChatGeneration[][];
    return generations[0][0].message;
  }

  async callPrompt(
    promptValue: BasePromptValue,
    stop?: string[],
    callbacks?: CallbackManager | BaseCallbackHandler[]
  ): Promise<BaseChatMessage> {
    const promptMessages: BaseChatMessage[] = promptValue.toChatMessages();
    return this.call(promptMessages, stop, callbacks);
  }
}

export abstract class SimpleChatModel extends BaseChatModel {
  abstract _call(
    messages: BaseChatMessage[],
    stop?: string[],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string>;

  async _generate(
    messages: BaseChatMessage[],
    stop?: string[],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const text = await this._call(messages, stop, runManager);
    const message = new AIChatMessage(text);
    return {
      generations: [
        {
          text: message.text,
          message,
        },
      ],
    };
  }
}
