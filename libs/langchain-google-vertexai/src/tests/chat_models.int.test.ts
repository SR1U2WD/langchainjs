import { test } from "@jest/globals";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { ChatPromptValue } from "@langchain/core/prompt_values";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  BaseMessageChunk,
  BaseMessageLike,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ChatVertexAI } from "../chat_models.js";
import { GeminiTool } from "../types.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

describe("GAuth Chat", () => {
  test("invoke", async () => {
    const model = new ChatVertexAI();
    try {
      const res = await model.invoke("What is 1 + 1?");
      expect(res).toBeDefined();
      expect(res._getType()).toEqual("ai");

      const aiMessage = res as AIMessageChunk;
      expect(aiMessage.content).toBeDefined();

      expect(typeof aiMessage.content).toBe("string");
      const text = aiMessage.content as string;
      expect(text).toMatch(/(1 + 1 (equals|is|=) )?2.? ?/);

      /*
      expect(aiMessage.content.length).toBeGreaterThan(0);
      expect(aiMessage.content[0]).toBeDefined();
      const content = aiMessage.content[0] as MessageContentComplex;
      expect(content).toHaveProperty("type");
      expect(content.type).toEqual("text");

      const textContent = content as MessageContentText;
      expect(textContent.text).toBeDefined();
      expect(textContent.text).toEqual("2");
      */
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test("generate", async () => {
    const model = new ChatVertexAI();
    try {
      const messages: BaseMessage[] = [
        new SystemMessage(
          "You will reply to all requests to flip a coin with either H, indicating heads, or T, indicating tails."
        ),
        new HumanMessage("Flip it"),
        new AIMessage("T"),
        new HumanMessage("Flip the coin again"),
      ];
      const res = await model.predictMessages(messages);
      expect(res).toBeDefined();
      expect(res._getType()).toEqual("ai");

      const aiMessage = res as AIMessageChunk;
      expect(aiMessage.content).toBeDefined();

      expect(typeof aiMessage.content).toBe("string");
      const text = aiMessage.content as string;
      expect(["H", "T"]).toContainEqual(text);

      /*
      expect(aiMessage.content.length).toBeGreaterThan(0);
      expect(aiMessage.content[0]).toBeDefined();

      const content = aiMessage.content[0] as MessageContentComplex;
      expect(content).toHaveProperty("type");
      expect(content.type).toEqual("text");

      const textContent = content as MessageContentText;
      expect(textContent.text).toBeDefined();
      expect(["H", "T"]).toContainEqual(textContent.text);
      */
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test("stream", async () => {
    const model = new ChatVertexAI();
    try {
      const input: BaseLanguageModelInput = new ChatPromptValue([
        new SystemMessage(
          "You will reply to all requests to flip a coin with either H, indicating heads, or T, indicating tails."
        ),
        new HumanMessage("Flip it"),
        new AIMessage("T"),
        new HumanMessage("Flip the coin again"),
      ]);
      const res = await model.stream(input);
      const resArray: BaseMessageChunk[] = [];
      for await (const chunk of res) {
        resArray.push(chunk);
      }
      expect(resArray).toBeDefined();
      expect(resArray.length).toBeGreaterThanOrEqual(1);

      const lastChunk = resArray[resArray.length - 1];
      expect(lastChunk).toBeDefined();
      expect(lastChunk._getType()).toEqual("ai");
      const aiChunk = lastChunk as AIMessageChunk;
      console.log(aiChunk);

      console.log(JSON.stringify(resArray, null, 2));
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test("function", async () => {
    const tools: GeminiTool[] = [
      {
        functionDeclarations: [
          {
            name: "test",
            description:
              "Run a test with a specific name and get if it passed or failed",
            parameters: {
              type: "object",
              properties: {
                testName: {
                  type: "string",
                  description: "The name of the test that should be run.",
                },
              },
              required: ["testName"],
            },
          },
        ],
      },
    ];
    const model = new ChatVertexAI().bind({ tools });
    const result = await model.invoke("Run a test on the cobalt project");
    expect(result).toHaveProperty("content");
    expect(result.content).toBe("");
    const args = result?.lc_kwargs?.additional_kwargs;
    expect(args).toBeDefined();
    expect(args).toHaveProperty("tool_calls");
    expect(Array.isArray(args.tool_calls)).toBeTruthy();
    expect(args.tool_calls).toHaveLength(1);
    const call = args.tool_calls[0];
    expect(call).toHaveProperty("type");
    expect(call.type).toBe("function");
    expect(call).toHaveProperty("function");
    const func = call.function;
    expect(func).toBeDefined();
    expect(func).toHaveProperty("name");
    expect(func.name).toBe("test");
    expect(func).toHaveProperty("arguments");
    expect(typeof func.arguments).toBe("string");
    expect(func.arguments.replaceAll("\n", "")).toBe('{"testName":"cobalt"}');
  });

  test("function reply", async () => {
    const tools: GeminiTool[] = [
      {
        functionDeclarations: [
          {
            name: "test",
            description:
              "Run a test with a specific name and get if it passed or failed",
            parameters: {
              type: "object",
              properties: {
                testName: {
                  type: "string",
                  description: "The name of the test that should be run.",
                },
              },
              required: ["testName"],
            },
          },
        ],
      },
    ];
    const model = new ChatVertexAI().bind({ tools });
    const toolResult = {
      testPassed: true,
    };
    const messages: BaseMessageLike[] = [
      new HumanMessage("Run a test on the cobalt project."),
      new AIMessage("", {
        tool_calls: [
          {
            id: "test",
            type: "function",
            function: {
              name: "test",
              arguments: '{"testName":"cobalt"}',
            },
          },
        ],
      }),
      new ToolMessage(JSON.stringify(toolResult), "test"),
    ];
    const res = await model.stream(messages);
    const resArray: BaseMessageChunk[] = [];
    for await (const chunk of res) {
      resArray.push(chunk);
    }
    console.log(JSON.stringify(resArray, null, 2));
  });

  test("withStructuredOutput", async () => {
    const tool = {
      name: "get_weather",
      description:
        "Get the weather of a specific location and return the temperature in Celsius.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The name of city to get the weather for.",
          },
        },
        required: ["location"],
      },
    };
    const model = new ChatVertexAI().withStructuredOutput(tool);
    const result = await model.invoke("What is the weather in Paris?");
    expect(result).toHaveProperty("location");
  });
});

test("Stream token count usage_metadata", async () => {
  const model = new ChatVertexAI({
    temperature: 0,
    maxOutputTokens: 10,
  });
  let res: AIMessageChunk | null = null;
  for await (const chunk of await model.stream(
    "Why is the sky blue? Be concise."
  )) {
    if (!res) {
      res = chunk;
    } else {
      res = res.concat(chunk);
    }
  }
  console.log(res);
  expect(res?.usage_metadata).toBeDefined();
  if (!res?.usage_metadata) {
    return;
  }
  expect(res.usage_metadata.input_tokens).toBeGreaterThan(1);
  expect(res.usage_metadata.output_tokens).toBeGreaterThan(1);
  expect(res.usage_metadata.total_tokens).toBe(
    res.usage_metadata.input_tokens + res.usage_metadata.output_tokens
  );
});

test("streamUsage excludes token usage", async () => {
  const model = new ChatVertexAI({
    temperature: 0,
    streamUsage: false,
  });
  let res: AIMessageChunk | null = null;
  for await (const chunk of await model.stream(
    "Why is the sky blue? Be concise."
  )) {
    if (!res) {
      res = chunk;
    } else {
      res = res.concat(chunk);
    }
  }
  console.log(res);
  expect(res?.usage_metadata).not.toBeDefined();
});

test("Invoke token count usage_metadata", async () => {
  const model = new ChatVertexAI({
    temperature: 0,
    maxOutputTokens: 10,
  });
  const res = await model.invoke("Why is the sky blue? Be concise.");
  console.log(res);
  expect(res?.usage_metadata).toBeDefined();
  if (!res?.usage_metadata) {
    return;
  }
  expect(res.usage_metadata.input_tokens).toBeGreaterThan(1);
  expect(res.usage_metadata.output_tokens).toBeGreaterThan(1);
  expect(res.usage_metadata.total_tokens).toBe(
    res.usage_metadata.input_tokens + res.usage_metadata.output_tokens
  );
});

test("Streaming true constructor param will stream", async () => {
  const modelWithStreaming = new ChatVertexAI({
    maxOutputTokens: 50,
    streaming: true,
  });

  let totalTokenCount = 0;
  let tokensString = "";
  const result = await modelWithStreaming.invoke("What is 1 + 1?", {
    callbacks: [
      {
        handleLLMNewToken: (tok) => {
          totalTokenCount += 1;
          tokensString += tok;
        },
      },
    ],
  });

  expect(result).toBeDefined();
  expect(result.content).toBe(tokensString);

  expect(totalTokenCount).toBeGreaterThan(1);
});

test.only("tool_choice works", async () => {
  const model = new ChatVertexAI({
    model: "gemini-1.5-pro",
  });
  const weatherTool = tool(
    (_) => {
      return "no-op";
    },
    {
      name: "get_weather",
      description:
        "Get the weather of a specific location and return the temperature in Celsius.",
      schema: z.object({
        location: z
          .string()
          .describe("The name of city to get the weather for."),
      }),
    }
  );
  const calculatorTool = tool(
    (_) => {
      return "no-op";
    },
    {
      name: "calculator",
      description: "Calculate the result of a math expression.",
      schema: z.object({
        expression: z.string().describe("The math expression to calculate."),
      }),
    }
  );
  const modelWithTools = model.bind({
    tools: [weatherTool, calculatorTool],
    tool_choice: "get_weather",
  });
  // const modelWithTools = model.bindTools([weatherTool]);

  // const result = await modelWithTools.invoke("Whats the weather like in paris today?");
  const result = await modelWithTools.invoke(
    "Whats the weather like in paris today? also, what's 18628362 plus 18361?"
  );
  console.log(result);
  expect(result.tool_calls).toBeDefined();
  console.log(result.tool_calls);
});
