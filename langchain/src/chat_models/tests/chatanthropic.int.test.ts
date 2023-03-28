import { expect, test } from "@jest/globals";
import { HumanChatMessage } from "../../schema/index.js";
import { ChatPromptValue } from "../../prompts/chat.js";
import {
  PromptTemplate,
  ChatPromptTemplate,
  AIMessagePromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "../../prompts/index.js";
import { ChatAnthropic } from "../anthropic.js";
import { CallbackManager } from "../../callbacks/index.js";

test("Test ChatAnthropic", async () => {
  const chat = new ChatAnthropic({ modelName: "claude-v1" });
  const message = new HumanChatMessage("Hello!");
  const res = await chat.call([message]);
  console.log({ res });
});

test("Test ChatAnthropic Generate", async () => {
  const chat = new ChatAnthropic({
    modelName: "claude-v1",
  });
  const message = new HumanChatMessage("Hello!");
  const res = await chat.generate([[message], [message]]);
  expect(res.generations.length).toBe(2);
  for (const generation of res.generations) {
    expect(generation.length).toBe(1);
    for (const message of generation) {
      console.log(message.text);
    }
  }
  console.log({ res });
});

test("Test ChatAnthropic tokenUsage with a batch", async () => {
  const model = new ChatAnthropic({
    temperature: 0,
    modelName: "claude-v1",
  });
  const res = await model.generate([
    [new HumanChatMessage(`Hello!`)],
    [new HumanChatMessage(`Hi!`)],
  ]);
  console.log({ res });
});

test("Test ChatAnthropic in streaming mode", async () => {
  let nrNewTokens = 0;
  let streamedCompletion = "";

  const model = new ChatAnthropic({
    modelName: "claude-v1",
    streaming: true,
    callbackManager: CallbackManager.fromHandlers({
      async handleLLMNewToken(token: string) {
        nrNewTokens += 1;
        streamedCompletion += token;
      },
    }),
  });
  const message = new HumanChatMessage("Hello!");
  const res = await model.call([message]);
  console.log({ res });

  expect(nrNewTokens > 0).toBe(true);
  expect(res.text).toBe(streamedCompletion);
});

test("Test ChatAnthropic prompt value", async () => {
  const chat = new ChatAnthropic({
    modelName: "claude-v1",
  });
  const message = new HumanChatMessage("Hello!");
  const res = await chat.generatePrompt([new ChatPromptValue([message])]);
  expect(res.generations.length).toBe(1);
  for (const generation of res.generations) {
    for (const g of generation) {
      console.log(g.text);
    }
  }
  console.log({ res });
});

test("ChatAnthropic, docs, prompt templates", async () => {
  const chat = new ChatAnthropic({ temperature: 0 });

  const systemPrompt = PromptTemplate.fromTemplate(
    "You are a helpful assistant that translates {input_language} to {output_language}."
  );

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    new SystemMessagePromptTemplate(systemPrompt),
    HumanMessagePromptTemplate.fromTemplate("{text}"),
  ]);

  const responseA = await chat.generatePrompt([
    await chatPrompt.formatPromptValue({
      input_language: "English",
      output_language: "French",
      text: "I love programming.",
    }),
  ]);

  console.log(responseA.generations);
}, 50000);

test("ChatAnthropic, longer chain of messages", async () => {
  const chat = new ChatAnthropic({ temperature: 0 });

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    HumanMessagePromptTemplate.fromTemplate(`Hi, my name is Joe!`),
    AIMessagePromptTemplate.fromTemplate(`Nice to meet you, Joe!`),
    HumanMessagePromptTemplate.fromTemplate("{text}"),
  ]);

  const responseA = await chat.generatePrompt([
    await chatPrompt.formatPromptValue({
      text: "What did I say my name was?",
    }),
  ]);

  console.log(responseA.generations);
}, 50000);
