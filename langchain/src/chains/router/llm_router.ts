import { z } from "zod";
import { BasePromptTemplate } from "../../prompts/base.js";
import { LLMChain } from "../../chains/llm_chain.js";
import { RouterChain } from "./multi_route.js";
import { CallbackManagerForChainRun } from "../../callbacks/manager.js";
import { ChainValues } from "../../schema/index.js";
import { BaseLanguageModel } from "../../base_language/index.js";
import { ChainInputs } from "../../chains/base.js";

export type RouterOutputSchema = z.ZodObject<{
  destination: z.ZodNullable<z.ZodString>;
  next_inputs: z.ZodRecord<z.ZodString, z.ZodAny>;
}>;

export interface LLMRouterChainInput extends ChainInputs {
  llmChain: LLMChain<z.infer<RouterOutputSchema>>;
}

export class LLMRouterChain extends RouterChain {
  llmChain: LLMChain<z.infer<RouterOutputSchema>>;

  constructor(fields: LLMRouterChainInput) {
    super(fields.memory, fields.verbose, fields.callbackManager);
    this.llmChain = fields.llmChain;
  }

  get inputKeys(): string[] {
    return this.llmChain.inputKeys;
  }

  async _call(
    values: ChainValues,
    runManager?: CallbackManagerForChainRun | undefined
  ): Promise<ChainValues> {
    return this.llmChain.predict(values, runManager?.getChild());
  }

  _chainType(): string {
    return "llm_router_chain";
  }

  static fromLLM(
    llm: BaseLanguageModel,
    prompt: BasePromptTemplate,
    options?: Omit<LLMRouterChainInput, "llm">
  ) {
    const llmChain = new LLMChain<z.infer<RouterOutputSchema>>({ llm, prompt });
    return new LLMRouterChain({ ...options, llmChain });
  }
}
