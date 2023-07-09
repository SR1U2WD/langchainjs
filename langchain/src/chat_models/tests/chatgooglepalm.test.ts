/* eslint-disable no-new */
import { test, expect } from "@jest/globals";
import { protos } from "@google-ai/generativelanguage";
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
} from "../../schema/index.js";
import { ChatGooglePalm } from "../googlepalm.js";

test("Google Palm Chat - `model` name starts with `models/`", async () => {
  expect(() => {
    new ChatGooglePalm({
      model: `chat-bison-001`,
    });
  }).toThrow();
});

test("Google Palm Chat - `temperature` must be in range [0.0,1.0]", async () => {
  expect(() => {
    new ChatGooglePalm({
      temperature: -1.0,
    });
  }).toThrow();
  expect(() => {
    new ChatGooglePalm({
      temperature: 1.1,
    });
  }).toThrow();
});

test("Google Palm Chat - `topP` must be positive", async () => {
  expect(() => {
    new ChatGooglePalm({
      topP: -1,
    });
  }).toThrow();
});

test("Google Palm Chat - `topK` must be positive", async () => {
  expect(() => {
    new ChatGooglePalm({
      topK: -1,
    });
  }).toThrow();
});

test("Google Palm Chat - `apiKey` must be available if no `ChatGooglePalm_API_KEY` env available", async () => {
  expect(() => {
    new ChatGooglePalm({});
  }).toThrow();
});

test("Google Palm Chat - gets the Palm prompt context from 'system' messages", async () => {
  const messages: BaseMessage[] = [
    new SystemMessage("system-1"),
    new AIMessage("ai-1"),
    new HumanMessage("human-1"),
    new SystemMessage("system-2"),
  ];
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const context = model._getPalmContextInstruction(messages);
  expect(context).toBe("system-1");
});

test("Google Palm Chat - maps `BaseMessage` to Palm message", async () => {
  const messages: BaseMessage[] = [
    new SystemMessage("system-1"),
    new AIMessage("ai-1"),
    new HumanMessage("human-1"),
    new AIMessage({
      content: "ai-2",
      name: "droid",
      additional_kwargs: {
        citationSources: [
          {
            startIndex: 0,
            endIndex: 5,
            uri: "https://example.com",
            license: "MIT",
          },
        ],
      },
    }),
    new HumanMessage({
      content: "human-2",
      name: "skywalker",
    }),
  ];
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const palmMessages = model._mapBaseMessagesToPalmMessages(messages);
  expect(palmMessages.length).toEqual(4);
  expect(palmMessages[0]).toBe({
    author: undefined,
    content: "ai-1",
    citationMetadata: undefined,
  });
  expect(palmMessages[1]).toBe({
    author: undefined,
    content: "human-1",
    citationMetadata: undefined,
  });
  expect(palmMessages[2]).toBe({
    author: "droid",
    content: "ai-2",
    citationMetadata: undefined,
  });
  expect(palmMessages[3]).toBe({
    author: "skywalker",
    content: "human-2",
    citationMetadata: {
      citationSources: [
        {
          startIndex: 0,
          endIndex: 5,
          uri: "https://example.com",
          license: "MIT",
        },
      ],
    },
  });
});

test("Google Palm Chat - removes 'system' messages while mapping `BaseMessage` to Palm message", async () => {
  const messages: BaseMessage[] = [
    new SystemMessage("system-1"),
    new AIMessage("ai-1"),
    new HumanMessage("human-1"),
    new SystemMessage("system-2"),
  ];
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const palmMessages = model._mapBaseMessagesToPalmMessages(messages);
  expect(palmMessages.length).toEqual(2);
  expect(palmMessages[0].content).toEqual("ai-1");
  expect(palmMessages[1].content).toEqual("human-1");
});

test("Google Palm Chat - merges consecutive 'ai'/'human' messages while mapping `BaseMessage` to Palm message", async () => {
  const messages: BaseMessage[] = [
    new AIMessage("ai-1"),
    new AIMessage("ai-2"),
    new HumanMessage("human-1"),
    new HumanMessage("human-2"),
    new AIMessage("ai-3"),
  ];
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const palmMessages = model._mapBaseMessagesToPalmMessages(messages);
  expect(palmMessages.length).toEqual(3);
  expect(palmMessages[0].content).toEqual("ai-1\nai-2");
  expect(palmMessages[1].content).toEqual("human-1\nhuman-2");
  expect(palmMessages[2].content).toEqual("ai-3");
});

test("Google Palm Chat - maps Palm generated message to `AIMessage` chat result", async () => {
  const generations: protos.google.ai.generativelanguage.v1beta2.IGenerateMessageResponse =
    {
      candidates: [
        {
          author: "droid",
          content: "ai-1",
          citationMetadata: {
            citationSources: [
              {
                startIndex: 0,
                endIndex: 5,
                uri: "https://example.com",
                license: "MIT",
              },
            ],
          },
        },
      ],
      filters: [
        {
          message: "potential problem",
          reason: "SAFETY",
        },
      ],
    };
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const chatResult = model._mapPalmMessagesToChatResult(generations);
  expect(chatResult.generations.length).toEqual(1);
  expect(chatResult.generations[0].text).toBe("ai-1");
  expect(chatResult.generations[0].message._getType()).toBe("ai");
  expect(chatResult.generations[0].message.name).toBe("droid");
  expect(chatResult.generations[0].message.content).toBe("ai-1");
  expect(
    chatResult.generations[0].message.additional_kwargs.citationSources
  ).toBe([
    {
      startIndex: 0,
      endIndex: 5,
      uri: "https://example.com",
      license: "MIT",
    },
  ]);
  expect(chatResult.generations[0].message.additional_kwargs.filters).toBe([
    {
      message: "potential problem",
      reason: "SAFETY",
    },
  ]);
});

test("Google Palm Chat - gets empty chat result & reason if generation failed", async () => {
  const generations: protos.google.ai.generativelanguage.v1beta2.IGenerateMessageResponse =
    {
      candidates: [],
      filters: [
        {
          message: "potential problem",
          reason: "SAFETY",
        },
      ],
    };
  const model = new ChatGooglePalm({
    apiKey: "GOOGLEPALM_API_KEY",
  });

  const chatResult = model._mapPalmMessagesToChatResult(generations);
  expect(chatResult.generations.length).toEqual(0);
  expect(chatResult.llmOutput?.filters).toBe([
    {
      message: "potential problem",
      reason: "SAFETY",
    },
  ]);
});
