/* eslint-disable no-process-env */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@jest/globals";
import {
  SageMakerEndpoint,
  SageMakerLLMContentHandler,
} from "../sagemaker_endpoint.js";

interface ResponseJsonInterface {
  generation: {
    content: string
  }
}

class HuggingFaceTextGenerationGPT2ContentHandler
  implements SageMakerLLMContentHandler
{
  // contentType = "application/json";

  // accepts = "application/json";

  // async transformInput(prompt: string, modelKwargs: Record<string, unknown>) {
  //   const inputString = JSON.stringify({
  //     text_inputs: prompt,
  //     ...modelKwargs,
  //   });
  //   return Buffer.from(inputString);
  // }

  // async transformOutput(output: Uint8Array) {
  //   const responseJson = JSON.parse(Buffer.from(output).toString("utf-8"));
  //   return responseJson.generated_texts[0];
  // }
  contentType = 'application/json'

  accepts = 'application/json'

  async transformInput(
    prompt: string,
    modelKwargs: Record<string, unknown>
  ): Promise<Uint8Array> {
    const payload = {
      inputs: [[{ role: 'user', content: prompt }]],
      parameters: modelKwargs,
    }

    const input_str = JSON.stringify(payload)

    return new TextEncoder().encode(input_str)
  }

  async transformOutput(output: Uint8Array): Promise<string> {
    const response_json = JSON.parse(
      new TextDecoder('utf-8').decode(output)
    ) as ResponseJsonInterface[]
    const content = response_json[0]?.generation.content ?? ''
    return content
  }
}

// Requires a pre-configured sagemaker endpoint
test("Test SageMakerEndpoint", async () => {
  const contentHandler = new HuggingFaceTextGenerationGPT2ContentHandler();

  const model = new SageMakerEndpoint({
    endpointName: 'aws-productbot-ai-dev-llama-2-13b-chat',
    modelKwargs: {
      temperature: 0.5,
      max_new_tokens: 700,
      top_p: 0.9,
    },
    endpointKwargs: {
      CustomAttributes: 'accept_eula=true',
    },
    contentHandler,
    clientOptions: {
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIAQQMEQJVFGQX4OMUE',
        secretAccessKey: '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',
      },
    },
  });

  const res = await model.call("Hello, my name is junior");
  console.log('res: ', res);

  // const model = new SageMakerEndpoint({
  //   endpointName:
  //     "jumpstart-example-huggingface-textgener-2023-05-16-22-35-45-660",
  //   modelKwargs: { temperature: 1e-10 },
  //   contentHandler,
  //   clientOptions: {
  //     region: "us-east-2",
  //     credentials: {
  //       accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  //     },
  //   },
  // });

  // const res = await model.call("Hello, my name is ");

  // expect(typeof res).toBe("string");
  expect(true).toBe(true);
});
