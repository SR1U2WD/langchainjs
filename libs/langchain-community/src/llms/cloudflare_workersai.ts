import { LLM, type BaseLLMParams } from "@langchain/core/language_models/llms";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { GenerationChunk } from "@langchain/core/outputs";

import { convertEventStreamToIterableReadableDataStream } from "../util/event-source-parse.js";

/**
 * Interface for CloudflareWorkersAI input parameters.
 */
export interface CloudflareWorkersAIInput {
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
  model?: string;
  baseUrl?: string;
  streaming?: boolean;
}

/**
 * Class representing the CloudflareWorkersAI language model. It extends the LLM (Large
 * Language Model) class, providing a standard interface for interacting
 * with the CloudflareWorkersAI language model.
 */
export class CloudflareWorkersAI
  extends LLM
  implements CloudflareWorkersAIInput
{
  model = "@cf/meta/llama-2-7b-chat-int8";

  cloudflareAccountId?: string;

  cloudflareApiToken?: string;

  baseUrl: string;

  streaming = false;

  static lc_name() {
    return "CloudflareWorkersAI";
  }

  lc_serializable = true;
  
  lc_namespace = ["langchain-community", "llms", this._llmType()];

  constructor(fields?: CloudflareWorkersAIInput & BaseLLMParams) {
    super(fields ?? {});

    this.model = fields?.model ?? this.model;
    this.streaming = fields?.streaming ?? this.streaming;
    this.cloudflareAccountId =
      fields?.cloudflareAccountId ??
      getEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID");
    this.cloudflareApiToken =
      fields?.cloudflareApiToken ??
      getEnvironmentVariable("CLOUDFLARE_API_TOKEN");
    this.baseUrl =
      fields?.baseUrl ??
      `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/ai/run`;
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  /**
   * Method to validate the environment.
   */
  validateEnvironment() {
    if (this.baseUrl === undefined) {
      if (!this.cloudflareAccountId) {
        throw new Error(
          `No Cloudflare account ID found. Please provide it when instantiating the CloudflareWorkersAI class, or set it as "CLOUDFLARE_ACCOUNT_ID" in your environment variables.`
        );
      }
      if (!this.cloudflareApiToken) {
        throw new Error(
          `No Cloudflare API key found. Please provide it when instantiating the CloudflareWorkersAI class, or set it as "CLOUDFLARE_API_KEY" in your environment variables.`
        );
      }
    }
  }

  /** Get the identifying parameters for this LLM. */
  get identifyingParams() {
    return { model: this.model };
  }

  /**
   * Get the parameters used to invoke the model
   */
  invocationParams() {
    return {
      model: this.model,
    };
  }

  /** Get the type of LLM. */
  _llmType() {
    return "cloudflare";
  }

  async _request(
    prompt: string,
    options: this["ParsedCallOptions"],
    stream?: boolean
  ) {
    this.validateEnvironment();

    const url = `${this.baseUrl}/${this.model}`;
    const headers = {
      Authorization: `Bearer ${this.cloudflareApiToken}`,
      "Content-Type": "application/json",
    };

    const data = { prompt, stream };
    return this.caller.call(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        signal: options.signal,
      });
      if (!response.ok) {
        const error = new Error(
          `Cloudflare LLM call failed with status code ${response.status}`
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).response = response;
        throw error;
      }
      return response;
    });
  }

  async *_streamResponseChunks(
    prompt: string,
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<GenerationChunk> {
    const response = await this._request(prompt, options, true);
    if (!response.body) {
      throw new Error("Empty response from Cloudflare. Please try again.");
    }
    const stream = convertEventStreamToIterableReadableDataStream(
      response.body
    );
    for await (const chunk of stream) {
      if (chunk !== "[DONE]") {
        const parsedChunk = JSON.parse(chunk);
        const generationChunk = new GenerationChunk({
          text: parsedChunk.response,
        });
        yield generationChunk;
        // eslint-disable-next-line no-void
        void runManager?.handleLLMNewToken(generationChunk.text ?? "");
      }
    }
  }

  /** Call out to CloudflareWorkersAI's complete endpoint.
   Args:
       prompt: The prompt to pass into the model.
   Returns:
       The string generated by the model.
   Example:
   let response = CloudflareWorkersAI.call("Tell me a joke.");
   */
  async _call(
    prompt: string,
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    if (!this.streaming) {
      const response = await this._request(prompt, options);

      const responseData = await response.json();

      return responseData.result.response;
    } else {
      const stream = this._streamResponseChunks(prompt, options, runManager);
      let finalResult: GenerationChunk | undefined;
      for await (const chunk of stream) {
        if (finalResult === undefined) {
          finalResult = chunk;
        } else {
          finalResult = finalResult.concat(chunk);
        }
      }
      return finalResult?.text ?? "";
    }
  }
}
