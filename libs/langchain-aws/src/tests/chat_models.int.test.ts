/* eslint-disable no-process-env */

import { test, expect } from "@jest/globals";
import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatBedrockConverse } from "../chat_models.js";
import { convertToConverseMessages } from "../common.js";

// Save the original value of the 'LANGCHAIN_CALLBACKS_BACKGROUND' environment variable
const originalBackground = process.env.LANGCHAIN_CALLBACKS_BACKGROUND;

const baseConstructorArgs: Partial<
  ConstructorParameters<typeof ChatBedrockConverse>[0]
> = {
  region: process.env.BEDROCK_AWS_REGION ?? "us-east-1",
  credentials: {
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
  },
  maxRetries: 1,
};

test("Test ChatBedrockConverse can invoke", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 5,
  });
  const res = await model.invoke([new HumanMessage("Print hello world")]);
  console.log({ res });
  expect(typeof res.content).toBe("string");
  expect(res.content.length).toBeGreaterThan(1);
  expect(res.content).not.toContain("world");
});

test("Test ChatBedrockConverse stream method", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 50,
  });
  const stream = await model.stream("Print hello world.");
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const finalMessage = chunks.map((c) => c.content).join("");
  console.log(finalMessage);
  expect(chunks.length).toBeGreaterThan(1);
});

test("Test ChatBedrockConverse in streaming mode", async () => {
  // Running LangChain callbacks in the background will sometimes cause the callbackManager to execute
  // after the test/llm call has already finished & returned. Set that environment variable to false
  // to prevent that from happening.
  process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "false";

  try {
    let nrNewTokens = 0;
    let streamedCompletion = "";

    const model = new ChatBedrockConverse({
      ...baseConstructorArgs,
      streaming: true,
      maxTokens: 10,
      callbacks: [
        {
          async handleLLMNewToken(token: string) {
            nrNewTokens += 1;
            streamedCompletion += token;
          },
        },
      ],
    });
    const message = new HumanMessage("Hello!");
    const result = await model.invoke([message]);
    console.log(result);

    expect(nrNewTokens > 0).toBe(true);
    expect(result.content).toBe(streamedCompletion);
  } finally {
    // Reset the environment variable
    process.env.LANGCHAIN_CALLBACKS_BACKGROUND = originalBackground;
  }
}, 10000);

test("Test ChatBedrockConverse with stop", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 5,
  });
  const res = await model.invoke([new HumanMessage("Print hello world")], {
    stop: ["world"],
  });
  console.log({ res });
  expect(typeof res.content).toBe("string");
  expect(res.content.length).toBeGreaterThan(1);
  expect(res.content).not.toContain("world");
});

test("Test ChatBedrockConverse stream method with early break", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 50,
  });
  const stream = await model.stream(
    "How is your day going? Be extremely verbose."
  );
  let i = 0;
  for await (const chunk of stream) {
    console.log(chunk);
    i += 1;
    if (i > 10) {
      break;
    }
  }
});

test("Streaming tokens can be found in usage_metadata field", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 5,
  });
  const response = await model.stream("Hello, how are you?");
  let finalResult: AIMessageChunk | undefined;
  for await (const chunk of response) {
    if (finalResult) {
      finalResult = finalResult.concat(chunk);
    } else {
      finalResult = chunk;
    }
  }
  console.log({
    usage_metadata: finalResult?.usage_metadata,
  });
  expect(finalResult).toBeTruthy();
  expect(finalResult?.usage_metadata).toBeTruthy();
  expect(finalResult?.usage_metadata?.input_tokens).toBeGreaterThan(0);
  expect(finalResult?.usage_metadata?.output_tokens).toBeGreaterThan(0);
  expect(finalResult?.usage_metadata?.total_tokens).toBeGreaterThan(0);
});

test("populates ID field on AIMessage", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    maxTokens: 5,
  });
  const response = await model.invoke("Hell");
  console.log({
    invokeId: response.id,
  });
  expect(response.id?.length).toBeGreaterThan(1);

  /**
   * Bedrock Converse does not include an ID in
   * the response of a streaming call.
   */

  // Streaming
  // let finalChunk: AIMessageChunk | undefined;
  // for await (const chunk of await model.stream("Hell")) {
  //   if (!finalChunk) {
  //     finalChunk = chunk;
  //   } else {
  //     finalChunk = finalChunk.concat(chunk);
  //   }
  // }
  // console.log({
  //   streamId: finalChunk?.id,
  // });
  // expect(finalChunk?.id?.length).toBeGreaterThan(1);
});

test("Test ChatBedrockConverse can invoke tools", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
  });
  const tools = [
    tool(
      (input) => {
        console.log("tool", input);
        return "Hello";
      },
      {
        name: "get_weather",
        description: "Get the weather",
        schema: z.object({
          location: z.string().describe("Location to get the weather for"),
        }),
      }
    ),
  ];
  const modelWithTools = model.bindTools(tools);
  const result = await modelWithTools.invoke([
    new HumanMessage("Get the weather for London"),
  ]);

  expect(result.tool_calls).toBeDefined();
  expect(result.tool_calls).toHaveLength(1);
  console.log("result.tool_calls?.[0]", result.tool_calls?.[0]);
  expect(result.tool_calls?.[0].name).toBe("get_weather");
  expect(result.tool_calls?.[0].id).toBeDefined();
});

test("Test ChatBedrockConverse can invoke tools with non anthropic model", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
    model: "cohere.command-r-v1:0",
  });
  const tools = [
    tool(
      (input) => {
        console.log("tool", input);
        return "Hello";
      },
      {
        name: "get_weather",
        description: "Get the weather",
        schema: z.object({
          location: z.string().describe("Location to get the weather for"),
        }),
      }
    ),
  ];
  const modelWithTools = model.bindTools(tools);
  const result = await modelWithTools.invoke([
    new HumanMessage("Get the weather for London"),
  ]);

  expect(result.tool_calls).toBeDefined();
  expect(result.tool_calls).toHaveLength(1);
  console.log("result.tool_calls?.[0]", result.tool_calls?.[0]);
  expect(result.tool_calls?.[0].name).toBe("get_weather");
  expect(result.tool_calls?.[0].id).toBeDefined();
});

test("Test ChatBedrockConverse can stream tools", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
  });
  const tools = [
    tool(
      (input) => {
        console.log("tool", input);
        return "Hello";
      },
      {
        name: "get_weather",
        description: "Get the weather",
        schema: z.object({
          location: z.string().describe("Location to get the weather for"),
        }),
      }
    ),
  ];
  const modelWithTools = model.bindTools(tools);
  const stream = await modelWithTools.stream([
    new HumanMessage("Get the weather for London"),
  ]);

  let finalChunk: AIMessageChunk | undefined;
  for await (const chunk of stream) {
    if (!finalChunk) {
      finalChunk = chunk;
    } else {
      finalChunk = finalChunk.concat(chunk);
    }
  }
  expect(finalChunk?.tool_calls).toBeDefined();
  expect(finalChunk?.tool_calls).toHaveLength(1);
  console.log("result.tool_calls?.[0]", finalChunk?.tool_calls?.[0]);
  expect(finalChunk?.tool_calls?.[0].name).toBe("get_weather");
  expect(finalChunk?.tool_calls?.[0].id).toBeDefined();
});

test("Test ChatBedrockConverse tool_choice works", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
  });
  const tools = [
    tool(
      (input) => {
        console.log("tool", input);
        return "Hello";
      },
      {
        name: "get_weather",
        description: "Get the weather",
        schema: z.object({
          location: z.string().describe("Location to get the weather for"),
        }),
      }
    ),
    tool(
      (input) => {
        console.log("tool", input);
        return "Hello";
      },
      {
        name: "calculator",
        description: "Sum two numbers",
        schema: z.object({
          a: z.number().describe("First number to sum"),
          b: z.number().describe("Second number to sum"),
        }),
      }
    ),
  ];
  const modelWithTools = model.bindTools(tools, {
    tool_choice: "get_weather",
  });
  const result = await modelWithTools.invoke([
    new HumanMessage(
      "What is 261319136 plus 81863183? It is VERY important you tell me the answer to that math problem."
    ),
  ]);

  expect(result.tool_calls).toBeDefined();
  expect(result.tool_calls).toHaveLength(1);
  console.log("result.tool_calls?.[0]", result.tool_calls?.[0]);
  expect(result.tool_calls?.[0].name).toBe("get_weather");
  expect(result.tool_calls?.[0].id).toBeDefined();
});

test("convertToConverseMessages works", () => {
  const messages = [
    new SystemMessage("You're an advanced AI assistant."),
    new HumanMessage(
      "What's the weather like today in Berkeley, CA? Use weather.com to check."
    ),
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "retrieverTool",
          args: {
            url: "https://weather.com",
          },
          id: "123_retriever_tool",
        },
      ],
    }),
    new ToolMessage({
      tool_call_id: "123_retriever_tool",
      content: "The weather in Berkeley, CA is 70 degrees and sunny.",
    }),
  ];

  const { converseMessages, converseSystem } =
    convertToConverseMessages(messages);

  expect(converseSystem).toHaveLength(1);
  expect(converseSystem[0].text).toBe("You're an advanced AI assistant.");

  expect(converseMessages).toHaveLength(3);

  const userMsgs = converseMessages.filter((msg) => msg.role === "user");
  // Length of two because of the first user question, and tool use
  // messages will have the user role.
  expect(userMsgs).toHaveLength(2);
  const textUserMsg = userMsgs.find((msg) => msg.content?.[0].text);
  expect(textUserMsg?.content?.[0].text).toBe(
    "What's the weather like today in Berkeley, CA? Use weather.com to check."
  );

  const toolUseUserMsg = userMsgs.find((msg) => msg.content?.[0].toolResult);
  expect(toolUseUserMsg).toBeDefined();
  expect(toolUseUserMsg?.content).toHaveLength(1);
  if (!toolUseUserMsg?.content?.length) return;

  const toolResultContent = toolUseUserMsg.content[0];
  expect(toolResultContent).toBeDefined();
  expect(toolResultContent.toolResult?.toolUseId).toBe("123_retriever_tool");
  expect(toolResultContent.toolResult?.content?.[0].text).toBe(
    "The weather in Berkeley, CA is 70 degrees and sunny."
  );

  const assistantMsg = converseMessages.find((msg) => msg.role === "assistant");
  expect(assistantMsg).toBeDefined();
  if (!assistantMsg) return;

  const toolUseContent = assistantMsg.content?.find((c) => "toolUse" in c);
  expect(toolUseContent).toBeDefined();
  expect(toolUseContent?.toolUse?.name).toBe("retrieverTool");
  expect(toolUseContent?.toolUse?.toolUseId).toBe("123_retriever_tool");
  expect(toolUseContent?.toolUse?.input).toEqual({
    url: "https://weather.com",
  });
});

test("Model can handle empty content messages", async () => {
  const model = new ChatBedrockConverse({
    ...baseConstructorArgs,
  });

  const retrieverTool = tool(
    (_) => "Success",
    {
      name: "retrieverTool",
      schema: z.object({
        url: z.string().describe("The URL to fetch"),
      }),
      description: "A tool to fetch data from a URL",
    }
  );

  const messages = [
    new SystemMessage("You're an advanced AI assistant."),
    new HumanMessage(
      "What's the weather like today in Berkeley, CA? Use weather.com to check."
    ),
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "retrieverTool",
          args: {
            url: "https://weather.com",
          },
          id: "123_retriever_tool",
        },
      ],
    }),
    new ToolMessage({
      tool_call_id: "123_retriever_tool",
      content: "The weather in Berkeley, CA is 70 degrees and sunny.",
    }),
  ];

  const result = await model.bindTools([retrieverTool]).invoke(messages);

  expect(result.content).toBeDefined();
  expect(typeof result.content).toBe("string");
  expect(result.content.length).toBeGreaterThan(1);
});
