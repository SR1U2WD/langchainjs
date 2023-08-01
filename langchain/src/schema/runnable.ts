import { BaseCallbackConfig, CallbackManager } from "../callbacks/manager.js";
import { Serializable } from "../load/serializable.js";
import { IterableReadableStream } from "../util/stream.js";

export type RunnableConfig = BaseCallbackConfig;

export type RunnableFunc<RunInput, RunOutput> = (
  input: RunInput
) => RunOutput | Promise<RunOutput>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RunnableLike<RunInput = any, RunOutput = any> =
  | Runnable<RunInput, RunOutput>
  | RunnableFunc<RunInput, RunOutput>
  | Record<
      string,
      Runnable<RunInput, RunOutput> | RunnableFunc<RunInput, RunOutput>
    >;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _coerceToDict(value: any, defaultKey: string) {
  return value && !Array.isArray(value) && typeof value === "object"
    ? value
    : { [defaultKey]: value };
}

export abstract class Runnable<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunInput = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput = any,
  CallOptions extends RunnableConfig = RunnableConfig
> extends Serializable {
  protected lc_runnable = true;

  abstract invoke(
    input: RunInput,
    options?: Partial<CallOptions>
  ): Promise<RunOutput>;

  protected _getOptionsList(
    options: Partial<CallOptions> | Partial<CallOptions>[],
    length = 0
  ): Partial<CallOptions>[] {
    if (Array.isArray(options)) {
      if (options.length !== length) {
        throw new Error(
          `Passed "options" must be an array with the same length as the inputs, but got ${options.length} options for ${length} inputs`
        );
      }
      return options;
    }
    return Array.from({ length }, () => options);
  }

  async batch(
    inputs: RunInput[],
    options?: Partial<CallOptions> | Partial<CallOptions>[],
    batchOptions?: {
      maxConcurrency?: number;
    }
  ): Promise<RunOutput[]> {
    const configList = this._getOptionsList(options ?? {}, inputs.length);
    const batchSize =
      batchOptions?.maxConcurrency && batchOptions.maxConcurrency > 0
        ? batchOptions?.maxConcurrency
        : inputs.length;
    const batchResults = [];
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batchPromises = inputs
        .slice(i, i + batchSize)
        .map((input, i) => this.invoke(input, configList[i]));
      const batchResult = await Promise.all(batchPromises);
      batchResults.push(batchResult);
    }
    return batchResults.flat();
  }

  async *_streamIterator(
    input: RunInput,
    options?: Partial<CallOptions>
  ): AsyncGenerator<RunOutput> {
    yield this.invoke(input, options);
  }

  async stream(
    input: RunInput,
    options?: Partial<CallOptions>
  ): Promise<IterableReadableStream<RunOutput>> {
    return IterableReadableStream.fromAsyncGenerator(
      this._streamIterator(input, options)
    );
  }

  protected _separateRunnableConfigFromCallOptions(
    options: Partial<CallOptions> = {}
  ): [RunnableConfig, Omit<Partial<CallOptions>, keyof RunnableConfig>] {
    const runnableConfig: RunnableConfig = {
      callbacks: options.callbacks,
      tags: options.tags,
      metadata: options.metadata,
    };
    const callOptions = { ...options };
    delete callOptions.callbacks;
    delete callOptions.tags;
    delete callOptions.metadata;
    return [runnableConfig, callOptions];
  }

  protected async _callWithConfig<T extends RunInput>(
    func: (input: T) => Promise<RunOutput>,
    input: T,
    options?: RunnableConfig
  ) {
    const callbackManager_ = await CallbackManager.configure(
      options?.callbacks,
      undefined,
      options?.tags,
      undefined,
      options?.metadata
    );
    const runManager = await callbackManager_?.handleChainStart(
      this.toJSON(),
      _coerceToDict(input, "input")
    );
    let output;
    try {
      output = await func.bind(this)(input);
    } catch (e) {
      await runManager?.handleChainError(e);
      throw e;
    }
    await runManager?.handleChainEnd(_coerceToDict(output, "output"));
    return output;
  }

  _patchConfig(
    config: Partial<CallOptions> = {},
    callbackManager: CallbackManager | undefined = undefined
  ): Partial<CallOptions> {
    return { ...config, callbacks: callbackManager };
  }

  pipe<NewRunOutput>(
    coerceable: RunnableLike<RunOutput, NewRunOutput>
  ): RunnableSequence<RunInput, NewRunOutput> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new RunnableSequence({
      first: this,
      last: _coerceToRunnable(coerceable),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static isInstance(thing: any): thing is Runnable {
    return thing.lc_runnable;
  }
}

export class RunnableSequence<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunInput = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput = any
> extends Runnable<RunInput, RunOutput> {
  protected first: Runnable<RunInput>;

  protected middle: Runnable[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected last: Runnable<any, RunOutput>;

  lc_serializable = true;

  lc_namespace = ["schema", "runnable"];

  constructor(fields: {
    first: Runnable<RunInput>;
    middle?: Runnable[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last: Runnable<any, RunOutput>;
  }) {
    super(fields);
    this.first = fields.first;
    this.middle = fields.middle ?? this.middle;
    this.last = fields.last;
  }

  get steps() {
    return [this.first, ...this.middle, this.last];
  }

  async invoke(input: RunInput, options?: RunnableConfig): Promise<RunOutput> {
    const callbackManager_ = await CallbackManager.configure(
      options?.callbacks,
      undefined,
      options?.tags,
      undefined,
      options?.metadata
    );
    const runManager = await callbackManager_?.handleChainStart(
      this.toJSON(),
      _coerceToDict(input, "input")
    );
    let nextStepInput = input;
    let finalOutput: RunOutput;
    try {
      for (const step of [this.first, ...this.middle]) {
        nextStepInput = await step.invoke(
          nextStepInput,
          this._patchConfig(options, runManager?.getChild())
        );
      }
      // TypeScript can't detect that the last output of the sequence returns RunOutput, so call it out of the loop here
      finalOutput = await this.last.invoke(
        nextStepInput,
        this._patchConfig(options, runManager?.getChild())
      );
    } catch (e) {
      await runManager?.handleChainError(e);
      throw e;
    }
    await runManager?.handleChainEnd(_coerceToDict(finalOutput, "output"));
    return finalOutput;
  }

  async batch(
    inputs: RunInput[],
    options?: RunnableConfig | RunnableConfig[],
    batchOptions?: { maxConcurrency?: number }
  ): Promise<RunOutput[]> {
    const configList = this._getOptionsList(options ?? {}, inputs.length);
    const callbackManagers = await Promise.all(
      configList.map((config) =>
        CallbackManager.configure(
          config?.callbacks,
          undefined,
          config?.tags,
          undefined,
          config?.metadata
        )
      )
    );
    const runManagers = await Promise.all(
      callbackManagers.map((callbackManager, i) =>
        callbackManager?.handleChainStart(
          this.toJSON(),
          _coerceToDict(inputs[i], "input")
        )
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nextStepInputs: any = inputs;
    let finalOutputs: RunOutput[];
    try {
      for (let i = 0; i < [this.first, ...this.middle].length; i += 1) {
        const step = this.steps[i];
        nextStepInputs = await step.batch(
          nextStepInputs,
          runManagers.map(
            (runManager) =>
              this._patchConfig(configList[i], runManager?.getChild()),
            batchOptions
          )
        );
      }
      finalOutputs = await this.last.batch(
        nextStepInputs,
        runManagers.map(
          (runManager) =>
            this._patchConfig(
              configList[this.steps.length - 1],
              runManager?.getChild()
            ),
          batchOptions
        )
      );
    } catch (e) {
      await Promise.all(
        runManagers.map((runManager) => runManager?.handleChainError(e))
      );
      throw e;
    }
    await Promise.all(
      runManagers.map((runManager, i) =>
        runManager?.handleChainEnd(_coerceToDict(finalOutputs[i], "output"))
      )
    );
    return finalOutputs;
  }

  async *_streamIterator(
    input: RunInput,
    options?: RunnableConfig
  ): AsyncGenerator<RunOutput> {
    const callbackManager_ = await CallbackManager.configure(
      options?.callbacks,
      undefined,
      options?.tags,
      undefined,
      options?.metadata
    );
    const runManager = await callbackManager_?.handleChainStart(
      this.toJSON(),
      _coerceToDict(input, "input")
    );
    let nextStepInput = input;
    try {
      for (const step of [this.first, ...this.middle]) {
        nextStepInput = await step.invoke(
          nextStepInput,
          this._patchConfig(options, runManager?.getChild())
        );
      }
    } catch (e) {
      await runManager?.handleChainError(e);
      throw e;
    }
    let concatSupported = true;
    let finalOutput;
    try {
      const iterator = await this.last._streamIterator(
        nextStepInput,
        this._patchConfig(options, runManager?.getChild())
      );
      for await (const chunk of iterator) {
        yield chunk;
        if (concatSupported) {
          if (finalOutput === undefined) {
            finalOutput = chunk;
          } else {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              finalOutput = (finalOutput as any).concat(chunk);
            } catch (e) {
              finalOutput = undefined;
              concatSupported = false;
            }
          }
        }
      }
    } catch (e) {
      await runManager?.handleChainError(e);
      throw e;
    }
    await runManager?.handleChainEnd(_coerceToDict(finalOutput, "output"));
  }

  pipe<NewRunOutput>(
    coerceable: RunnableLike<RunOutput, NewRunOutput>
  ): RunnableSequence<RunInput, NewRunOutput> {
    if (RunnableSequence.isInstance(coerceable)) {
      return new RunnableSequence({
        first: this.first,
        middle: this.middle.concat([
          this.last,
          coerceable.first,
          ...coerceable.middle,
        ]),
        last: coerceable.last,
      });
    } else {
      return new RunnableSequence({
        first: this.first,
        middle: [...this.middle, this.last],
        last: _coerceToRunnable(coerceable),
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static isInstance(thing: any): thing is RunnableSequence {
    return Array.isArray(thing.middle) && Runnable.isInstance(thing);
  }

  static fromRunnables<RunInput, RunOutput>([first, ...runnables]: [
    RunnableLike<RunInput>,
    ...RunnableLike[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    RunnableLike<any, RunOutput>
  ]) {
    return new RunnableSequence<RunInput, RunOutput>({
      first: _coerceToRunnable(first),
      middle: runnables.slice(0, -1).map(_coerceToRunnable),
      last: _coerceToRunnable(runnables[runnables.length - 1]),
    });
  }
}

export class RunnableMap<RunInput> extends Runnable<
  RunInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>
> {
  lc_namespace = ["schema", "runnable"];

  lc_serializable = true;

  protected steps: Record<string, Runnable<RunInput>>;

  constructor(steps: Record<string, RunnableLike<RunInput>>) {
    super(steps);
    this.steps = {};
    for (const [key, value] of Object.entries(steps)) {
      this.steps[key] = _coerceToRunnable(value);
    }
  }

  async invoke(
    input: RunInput,
    options?: Partial<BaseCallbackConfig>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any>> {
    const callbackManager_ = await CallbackManager.configure(
      options?.callbacks,
      undefined,
      options?.tags,
      undefined,
      options?.metadata
    );
    const runManager = await callbackManager_?.handleChainStart(this.toJSON(), {
      input,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: Record<string, any> = {};
    try {
      for (const [key, runnable] of Object.entries(this.steps)) {
        const result = await runnable.invoke(
          input,
          this._patchConfig(options, runManager?.getChild())
        );
        output[key] = result;
      }
    } catch (e) {
      await runManager?.handleChainError(e);
      throw e;
    }
    await runManager?.handleChainEnd(output);
    return output;
  }
}

export class RunnableLambda<RunInput, RunOutput> extends Runnable<
  RunInput,
  RunOutput
> {
  lc_namespace = ["schema", "runnable"];

  constructor(protected func: RunnableFunc<RunInput, RunOutput>) {
    super(func);
  }

  async invoke(
    input: RunInput,
    options?: Partial<BaseCallbackConfig>
  ): Promise<RunOutput> {
    return this._callWithConfig(
      async (input: RunInput) => this.func(input),
      input,
      options
    );
  }
}

export class RunnablePassthrough<RunInput> extends Runnable<
  RunInput,
  RunInput
> {
  lc_namespace = ["schema", "runnable"];

  lc_serializable = true;

  async invoke(
    input: RunInput,
    options?: Partial<BaseCallbackConfig>
  ): Promise<RunInput> {
    return this._callWithConfig(
      (input: RunInput) => Promise.resolve(input),
      input,
      options
    );
  }
}

function _coerceToRunnable<RunInput, RunOutput>(
  coerceable: RunnableLike<RunInput, RunOutput>
): Runnable<RunInput, RunOutput> {
  if (typeof coerceable === "function") {
    return new RunnableLambda(coerceable);
  } else if (Runnable.isInstance(coerceable)) {
    return coerceable;
  } else if (!Array.isArray(coerceable) && typeof coerceable === "object") {
    const runnables: Record<string, Runnable<RunInput>> = {};
    for (const [key, value] of Object.entries(coerceable)) {
      runnables[key] = _coerceToRunnable(value);
    }
    return new RunnableMap<RunInput>(runnables) as Runnable<
      RunInput,
      RunOutput
    >;
  } else {
    throw new Error(
      `Expected a Runnable, function or object.\nInstead got an unsupported type.`
    );
  }
}
