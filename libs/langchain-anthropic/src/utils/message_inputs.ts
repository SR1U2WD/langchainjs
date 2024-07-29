/**
 * This util file contains functions for converting LangChain messages to Anthropic messages.
 */
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
  MessageContent,
  isAIMessage,
} from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { AnthropicMessageParam, AnthropicToolResponse } from "../types.js";

function _formatImage(imageUrl: string) {
  const regex = /^data:(image\/.+);base64,(.+)$/;
  const match = imageUrl.match(regex);
  if (match === null) {
    throw new Error(
      [
        "Anthropic only supports base64-encoded images currently.",
        "Example: data:image/png;base64,/9j/4AAQSk...",
      ].join("\n\n")
    );
  }
  return {
    type: "base64",
    media_type: match[1] ?? "",
    data: match[2] ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function _mergeMessages(
  messages: BaseMessage[]
): (SystemMessage | HumanMessage | AIMessage)[] {
  // Merge runs of human/tool messages into single human messages with content blocks.
  const merged = [];
  for (const message of messages) {
    if (message._getType() === "tool") {
      if (typeof message.content === "string") {
        merged.push(
          new HumanMessage({
            content: [
              {
                type: "tool_result",
                content: message.content,
                tool_use_id: (message as ToolMessage).tool_call_id,
              },
            ],
          })
        );
      } else {
        merged.push(new HumanMessage({ content: message.content }));
      }
    } else {
      const previousMessage = merged[merged.length - 1];
      if (
        previousMessage?._getType() === "human" &&
        message._getType() === "human"
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let combinedContent: Record<string, any>[];
        if (typeof previousMessage.content === "string") {
          combinedContent = [{ type: "text", text: previousMessage.content }];
        } else {
          combinedContent = previousMessage.content;
        }
        if (typeof message.content === "string") {
          combinedContent.push({ type: "text", text: message.content });
        } else {
          combinedContent = combinedContent.concat(message.content);
        }
        previousMessage.content = combinedContent;
      } else {
        merged.push(message);
      }
    }
  }
  return merged;
}

export function _convertLangChainToolCallToAnthropic(
  toolCall: ToolCall
): AnthropicToolResponse {
  if (toolCall.id === undefined) {
    throw new Error(`Anthropic requires all tool calls to have an "id".`);
  }
  return {
    type: "tool_use",
    id: toolCall.id,
    name: toolCall.name,
    input: toolCall.args,
  };
}

function _formatContent(content: MessageContent) {
  const toolTypes = ["tool_use", "tool_result", "input_json_delta"];
  const textTypes = ["text", "text_delta"];

  if (typeof content === "string") {
    return content;
  } else {
    const contentBlocks = content.map((contentPart) => {
      if (contentPart.type === "image_url") {
        let source;
        if (typeof contentPart.image_url === "string") {
          source = _formatImage(contentPart.image_url);
        } else {
          source = _formatImage(contentPart.image_url.url);
        }
        return {
          type: "image" as const, // Explicitly setting the type as "image"
          source,
        };
      } else if (
        textTypes.find((t) => t === contentPart.type) &&
        "text" in contentPart
      ) {
        // Assuming contentPart is of type MessageContentText here
        return {
          type: "text" as const, // Explicitly setting the type as "text"
          text: contentPart.text,
        };
      } else if (toolTypes.find((t) => t === contentPart.type)) {
        const contentPartCopy = { ...contentPart };
        if ("index" in contentPartCopy) {
          // Anthropic does not support passing the index field here, so we remove it.
          delete contentPartCopy.index;
        }

        if (contentPartCopy.type === "input_json_delta") {
          // `input_json_delta` type only represents yielding partial tool inputs
          // and is not a valid type for Anthropic messages.
          contentPartCopy.type = "tool_use";
        }

        if ("input" in contentPartCopy) {
          // Anthropic tool use inputs should be valid objects, when applicable.
          try {
            contentPartCopy.input = JSON.parse(contentPartCopy.input);
          } catch {
            // no-op
          }
        }

        // TODO: Fix when SDK types are fixed
        return {
          ...contentPartCopy,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      } else {
        throw new Error("Unsupported message content format");
      }
    });
    return contentBlocks;
  }
}

function _mergeAdjacentMessages(
  messages: AnthropicMessageParam[]
): AnthropicMessageParam[] {
  return messages.reduce((acc: AnthropicMessageParam[], current, index) => {
    if (index === 0) {
      return [current];
    }

    const previous = acc[acc.length - 1];

    if (
      previous.role === current.role &&
      Array.isArray(previous.content) &&
      Array.isArray(current.content)
    ) {
      previous.content = previous.content.concat(current.content);
      return acc;
    }

    return [...acc, current];
  }, []);
}

/**
 * Formats messages as a prompt for the model.
 * @param messages The base messages to format as a prompt.
 * @returns The formatted prompt.
 */
export function _formatMessagesForAnthropic(messages: BaseMessage[]): {
  system?: string;
  messages: AnthropicMessageParam[];
} {
  const mergedMessages = _mergeMessages(messages);
  let system: string | undefined;
  if (mergedMessages.length > 0 && mergedMessages[0]._getType() === "system") {
    if (typeof messages[0].content !== "string") {
      throw new Error("System message content must be a string.");
    }
    system = messages[0].content;
  }
  const conversationMessages =
    system !== undefined ? mergedMessages.slice(1) : mergedMessages;
  const formattedMessages = conversationMessages.map((message) => {
    let role;
    if (message._getType() === "human") {
      role = "user" as const;
    } else if (message._getType() === "ai") {
      role = "assistant" as const;
    } else if (message._getType() === "tool") {
      role = "user" as const;
    } else if (message._getType() === "system") {
      throw new Error(
        "System messages are only permitted as the first passed message."
      );
    } else {
      throw new Error(`Message type "${message._getType()}" is not supported.`);
    }
    if (isAIMessage(message) && !!message.tool_calls?.length) {
      if (typeof message.content === "string") {
        if (message.content === "") {
          return {
            role,
            content: message.tool_calls.map(
              _convertLangChainToolCallToAnthropic
            ),
          };
        } else {
          return {
            role,
            content: [
              { type: "text", text: message.content },
              ...message.tool_calls.map(_convertLangChainToolCallToAnthropic),
            ],
          };
        }
      } else {
        const { content } = message;
        const hasMismatchedToolCalls = !message.tool_calls.every((toolCall) =>
          content.find(
            (contentPart) =>
              (contentPart.type === "tool_use" ||
                contentPart.type === "input_json_delta") &&
              contentPart.id === toolCall.id
          )
        );
        if (hasMismatchedToolCalls) {
          console.warn(
            `The "tool_calls" field on a message is only respected if content is a string.`
          );
        }
        return {
          role,
          content: _formatContent(message.content),
        };
      }
    } else {
      return {
        role,
        content: _formatContent(message.content),
      };
    }
  });
  return {
    messages: _mergeAdjacentMessages(formattedMessages),
    system,
  };
}
