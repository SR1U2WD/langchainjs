/* eslint-disable no-process-env */
import { test, expect } from "@jest/globals";
import { ChatModelIntegrationTests } from "@langchain/standard-tests";
import { AIMessageChunk } from "@langchain/core/messages";
import { BedrockChat } from "../bedrock/index.js";
import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";

class BedrockChatStandardIntegrationTests extends ChatModelIntegrationTests<
  BaseChatModelCallOptions,
  AIMessageChunk
> {
  constructor() {
    const region = process.env.BEDROCK_AWS_REGION ?? "us-east-1";
    super({
      Cls: BedrockChat,
      chatModelHasToolCalling: false,
      chatModelHasStructuredOutput: false,
      constructorArgs: {
        region,
        model: "amazon.titan-text-express-v1",
        credentials: {
          secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
          accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
        }
      },
    });
  }

  async testUsageMetadataStreaming() {
    this.skipTestMessage(
      "testUsageMetadataStreaming",
      "BedrockChat",
      "Streaming tokens is not currently supported."
    );
  }

  async testUsageMetadata() {
    this.skipTestMessage(
      "testUsageMetadata",
      "BedrockChat",
      "Usage metadata tokens is not currently supported."
    );
  }
}

const testClass = new BedrockChatStandardIntegrationTests();

test("BedrockChatStandardIntegrationTests", async () => {
  const testResults = await testClass.runTests();
  expect(testResults).toBe(true);
});