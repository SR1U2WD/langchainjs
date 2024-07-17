import { Serializable, SerializedConstructor } from "../load/serializable.js";
import { StringWithAutocomplete } from "../utils/types/index.js";

export interface StoredMessageData {
  content: string;
  role: string | undefined;
  name: string | undefined;
  tool_call_id: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additional_kwargs?: Record<string, any>;
  /** Response metadata. For example: response headers, logprobs, token counts. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response_metadata?: Record<string, any>;
  id?: string;
}

export interface StoredMessage {
  type: string;
  data: StoredMessageData;
}

export interface StoredGeneration {
  text: string;
  message?: StoredMessage;
}

export interface StoredMessageV1 {
  type: string;
  role: string | undefined;
  text: string;
}

export type MessageType =
  | "human"
  | "ai"
  | "generic"
  | "system"
  | "function"
  | "tool"
  | "remove";

export type ImageDetail = "auto" | "low" | "high";

export type MessageContentText = {
  type: "text";
  text: string;
};

export type MessageContentImageUrl = {
  type: "image_url";
  image_url: string | { url: string; detail?: ImageDetail };
};

export type MessageContentComplex =
  | MessageContentText
  | MessageContentImageUrl
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (Record<string, any> & { type?: "text" | "image_url" | string })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | (Record<string, any> & { type?: never });

export type MessageContent = string | MessageContentComplex[];

export interface FunctionCall {
  /**
   * The arguments to call the function with, as generated by the model in JSON
   * format. Note that the model does not always generate valid JSON, and may
   * hallucinate parameters not defined by your function schema. Validate the
   * arguments in your code before calling your function.
   */
  arguments: string;

  /**
   * The name of the function to call.
   */
  name: string;
}

/**
 * @deprecated
 * Import as "OpenAIToolCall" instead
 */
export interface ToolCall {
  /**
   * The ID of the tool call.
   */
  id: string;

  /**
   * The function that the model called.
   */
  function: FunctionCall;

  /**
   * The type of the tool. Currently, only `function` is supported.
   */
  type: "function";
}

export type BaseMessageFields = {
  content: MessageContent;
  name?: string;
  additional_kwargs?: {
    function_call?: FunctionCall;
    tool_calls?: ToolCall[];
    [key: string]: unknown;
  };
  /** Response metadata. For example: response headers, logprobs, token counts. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response_metadata?: Record<string, any>;
  /**
   * An optional unique identifier for the message. This should ideally be
   * provided by the provider/model which created the message.
   */
  id?: string;
};

export function mergeContent(
  firstContent: MessageContent,
  secondContent: MessageContent
): MessageContent {
  // If first content is a string
  if (typeof firstContent === "string") {
    if (typeof secondContent === "string") {
      return firstContent + secondContent;
    } else {
      return [{ type: "text", text: firstContent }, ...secondContent];
    }
    // If both are arrays
  } else if (Array.isArray(secondContent)) {
    return (
      _mergeLists(firstContent, secondContent) ?? [
        ...firstContent,
        ...secondContent,
      ]
    );
  } else {
    // Otherwise, add the second content as a new element of the list
    return [...firstContent, { type: "text", text: secondContent }];
  }
}

function stringifyWithDepthLimit(obj: any, depthLimit: number): string {
  function helper(obj: any, currentDepth: number): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }
    if (currentDepth >= depthLimit) {
      return "[Object]";
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => helper(item, currentDepth + 1));
    }

    const result: any = {};
    for (const key of Object.keys(obj)) {
      result[key] = helper(obj[key], currentDepth + 1);
    }
    return result;
  }

  return JSON.stringify(helper(obj, 0), null, 2);
}

/**
 * Base class for all types of messages in a conversation. It includes
 * properties like `content`, `name`, and `additional_kwargs`. It also
 * includes methods like `toDict()` and `_getType()`.
 */
export abstract class BaseMessage
  extends Serializable
  implements BaseMessageFields
{
  lc_namespace = ["langchain_core", "messages"];

  lc_serializable = true;

  get lc_aliases(): Record<string, string> {
    // exclude snake case conversion to pascal case
    return {
      additional_kwargs: "additional_kwargs",
      response_metadata: "response_metadata",
    };
  }

  /**
   * @deprecated
   * Use {@link BaseMessage.content} instead.
   */
  get text(): string {
    return typeof this.content === "string" ? this.content : "";
  }

  /** The content of the message. */
  content: MessageContent;

  /** The name of the message sender in a multi-user chat. */
  name?: string;

  /** Additional keyword arguments */
  additional_kwargs: NonNullable<BaseMessageFields["additional_kwargs"]>;

  /** Response metadata. For example: response headers, logprobs, token counts. */
  response_metadata: NonNullable<BaseMessageFields["response_metadata"]>;

  /**
   * An optional unique identifier for the message. This should ideally be
   * provided by the provider/model which created the message.
   */
  id?: string;

  /** The type of the message. */
  abstract _getType(): MessageType;

  constructor(
    fields: string | BaseMessageFields,
    /** @deprecated */
    kwargs?: Record<string, unknown>
  ) {
    if (typeof fields === "string") {
      // eslint-disable-next-line no-param-reassign
      fields = {
        content: fields,
        additional_kwargs: kwargs,
        response_metadata: {},
      };
    }
    // Make sure the default value for additional_kwargs is passed into super() for serialization
    if (!fields.additional_kwargs) {
      // eslint-disable-next-line no-param-reassign
      fields.additional_kwargs = {};
    }
    if (!fields.response_metadata) {
      // eslint-disable-next-line no-param-reassign
      fields.response_metadata = {};
    }
    super(fields);
    this.name = fields.name;
    this.content = fields.content;
    this.additional_kwargs = fields.additional_kwargs;
    this.response_metadata = fields.response_metadata;
    this.id = fields.id;
  }

  toDict(): StoredMessage {
    return {
      type: this._getType(),
      data: (this.toJSON() as SerializedConstructor)
        .kwargs as StoredMessageData,
    };
  }

  static lc_name() {
    return "BaseMessage";
  }

  // Can't be protected for silly reasons
  get _printableFields(): Record<string, unknown> {
    return {
      id: this.id,
      content: this.content,
      name: this.name,
      additional_kwargs: this.additional_kwargs,
      response_metadata: this.response_metadata,
    };
  }

  toString() {
    const printable = stringifyWithDepthLimit(this._printableFields, 5);
    return `${(this.constructor as any).lc_name()} ${printable}`;
  }

  // Override the default behavior of console.log
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}

// TODO: Deprecate when SDK typing is updated
export type OpenAIToolCall = ToolCall & {
  index: number;
};

export function isOpenAIToolCallArray(
  value?: unknown
): value is OpenAIToolCall[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof (v as OpenAIToolCall).index === "number")
  );
}

export function _mergeDicts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  left: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  right: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (merged[key] == null) {
      merged[key] = value;
    } else if (value == null) {
      continue;
    } else if (
      typeof merged[key] !== typeof value ||
      Array.isArray(merged[key]) !== Array.isArray(value)
    ) {
      throw new Error(
        `field[${key}] already exists in the message chunk, but with a different type.`
      );
    } else if (typeof merged[key] === "string") {
      if (key === "type") {
        // Do not merge 'type' fields
        continue;
      }
      merged[key] += value;
    } else if (typeof merged[key] === "object" && !Array.isArray(merged[key])) {
      merged[key] = _mergeDicts(merged[key], value);
    } else if (Array.isArray(merged[key])) {
      merged[key] = _mergeLists(merged[key], value);
    } else if (merged[key] === value) {
      continue;
    } else {
      console.warn(
        `field[${key}] already exists in this message chunk and value has unsupported type.`
      );
    }
  }
  return merged;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function _mergeLists(left?: any[], right?: any[]) {
  if (left === undefined && right === undefined) {
    return undefined;
  } else if (left === undefined || right === undefined) {
    return left || right;
  } else {
    const merged = [...left];
    for (const item of right) {
      if (
        typeof item === "object" &&
        "index" in item &&
        typeof item.index === "number"
      ) {
        const toMerge = merged.findIndex(
          (leftItem) => leftItem.index === item.index
        );
        if (toMerge !== -1) {
          merged[toMerge] = _mergeDicts(merged[toMerge], item);
        } else {
          merged.push(item);
        }
      } else if (
        typeof item === "object" &&
        "text" in item &&
        item.text === ""
      ) {
        // No-op - skip empty text blocks
        continue;
      } else {
        merged.push(item);
      }
    }
    return merged;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function _mergeObj<T = any>(
  left: T | undefined,
  right: T | undefined
): T {
  if (!left && !right) {
    throw new Error("Cannot merge two undefined objects.");
  }
  if (!left || !right) {
    return left || (right as T);
  } else if (typeof left !== typeof right) {
    throw new Error(
      `Cannot merge objects of different types.\nLeft ${typeof left}\nRight ${typeof right}`
    );
  } else if (typeof left === "string" && typeof right === "string") {
    return (left + right) as T;
  } else if (Array.isArray(left) && Array.isArray(right)) {
    return _mergeLists(left, right) as T;
  } else if (typeof left === "object" && typeof right === "object") {
    return _mergeDicts(left, right) as T;
  } else if (left === right) {
    return left;
  } else {
    throw new Error(
      `Can not merge objects of different types.\nLeft ${left}\nRight ${right}`
    );
  }
}

/**
 * Represents a chunk of a message, which can be concatenated with other
 * message chunks. It includes a method `_merge_kwargs_dict()` for merging
 * additional keyword arguments from another `BaseMessageChunk` into this
 * one. It also overrides the `__add__()` method to support concatenation
 * of `BaseMessageChunk` instances.
 */
export abstract class BaseMessageChunk extends BaseMessage {
  abstract concat(chunk: BaseMessageChunk): BaseMessageChunk;
}

export type BaseMessageLike =
  | BaseMessage
  | ({
      type: MessageType | "user" | "assistant" | "placeholder";
    } & BaseMessageFields &
      Record<string, unknown>)
  | [
      StringWithAutocomplete<
        MessageType | "user" | "assistant" | "placeholder"
      >,
      MessageContent
    ]
  | string;

export function isBaseMessage(
  messageLike?: unknown
): messageLike is BaseMessage {
  return typeof (messageLike as BaseMessage)?._getType === "function";
}

export function isBaseMessageChunk(
  messageLike?: unknown
): messageLike is BaseMessageChunk {
  return (
    isBaseMessage(messageLike) &&
    typeof (messageLike as BaseMessageChunk).concat === "function"
  );
}
