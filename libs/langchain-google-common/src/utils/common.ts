import { StructuredToolInterface } from "@langchain/core/tools";
import type {
  GeminiFunctionDeclaration,
  GeminiFunctionSchema,
  GeminiTool,
  GoogleAIBaseLanguageModelCallOptions,
  GoogleAIModelParams,
  GoogleAIModelRequestParams,
  GoogleLLMModelFamily,
} from "../types.js";
import { isModelGemini, validateGeminiParams } from "./gemini.js";
import { isOpenAITool, ToolDefinition } from "@langchain/core/language_models/base";
import { RunnableToolLike } from "@langchain/core/runnables";
import { isStructuredTool } from "@langchain/core/utils/function_calling";
import { jsonSchemaToGeminiParameters, zodToGeminiParameters } from "./zod_to_gemini_parameters.js";

export function copyAIModelParams(
  params: GoogleAIModelParams | undefined,
  options: GoogleAIBaseLanguageModelCallOptions | undefined
): GoogleAIModelRequestParams {
  return copyAIModelParamsInto(params, options, {});
}

function processToolChoice(toolChoice: GoogleAIBaseLanguageModelCallOptions["tool_choice"], allowedFunctionNames: GoogleAIBaseLanguageModelCallOptions["allowed_function_names"]): {
  tool_choice: "any" | "auto" | "none";
  allowed_function_names?: string[];
} | undefined {

  if (!toolChoice) {
    if (allowedFunctionNames) {
      // Allowed func names is passed, return 'any' so it forces the model to use a tool.
      return {
        tool_choice: "any",
        allowed_function_names: allowedFunctionNames,
      };
    }
    return undefined;
  }

  if (toolChoice === "any" || toolChoice === "auto" || toolChoice === "none") {
    return {
      tool_choice: toolChoice,
      allowed_function_names: allowedFunctionNames,
    };
  }
  if (typeof toolChoice === "string") {
    // String representing the function name.
    // Return any to force the model to predict the specified function call.
    return {
      tool_choice: "any",
      allowed_function_names: [...(allowedFunctionNames ?? []), toolChoice],
    };
  }
  throw new Error("Object inputs for tool_choice not supported.")
}

export function convertToGeminiTools(
  structuredTools: (
    | StructuredToolInterface
    | Record<string, unknown>
    | ToolDefinition
    | RunnableToolLike
  )[]
): GeminiTool[] {
  return [
    {
      functionDeclarations: structuredTools.map(
        (structuredTool): GeminiFunctionDeclaration => {
          if (isStructuredTool(structuredTool)) {
            const jsonSchema = zodToGeminiParameters(structuredTool.schema);
            return {
              name: structuredTool.name,
              description: structuredTool.description,
              parameters: jsonSchema as GeminiFunctionSchema,
            };
          }
          if (isOpenAITool(structuredTool)) {
            return {
              name: structuredTool.function.name,
              description:
                structuredTool.function.description ??
                `A function available to call.`,
              parameters: jsonSchemaToGeminiParameters(
                structuredTool.function.parameters
              ),
            };
          }
          return structuredTool as unknown as GeminiFunctionDeclaration;
        }
      ),
    },
  ];
}

export function copyAIModelParamsInto(
  params: GoogleAIModelParams | undefined,
  options: GoogleAIBaseLanguageModelCallOptions | undefined,
  target: GoogleAIModelParams
): GoogleAIModelRequestParams {
  const ret: GoogleAIModelRequestParams = target || {};
  const model = options?.model ?? params?.model ?? target.model;
  ret.modelName =
    model ?? options?.modelName ?? params?.modelName ?? target.modelName;
  ret.model = model;
  ret.temperature =
    options?.temperature ?? params?.temperature ?? target.temperature;
  ret.maxOutputTokens =
    options?.maxOutputTokens ??
    params?.maxOutputTokens ??
    target.maxOutputTokens;
  ret.topP = options?.topP ?? params?.topP ?? target.topP;
  ret.topK = options?.topK ?? params?.topK ?? target.topK;
  ret.stopSequences =
    options?.stopSequences ?? params?.stopSequences ?? target.stopSequences;
  ret.safetySettings =
    options?.safetySettings ?? params?.safetySettings ?? target.safetySettings;
  ret.convertSystemMessageToHumanContent =
    options?.convertSystemMessageToHumanContent ??
    params?.convertSystemMessageToHumanContent ??
    target?.convertSystemMessageToHumanContent;
  ret.responseMimeType =
    options?.responseMimeType ??
    params?.responseMimeType ??
    target?.responseMimeType;
  ret.streaming = options?.streaming ?? params?.streaming ?? target?.streaming;
  const toolChoice = processToolChoice(options?.tool_choice, options?.allowed_function_names);
  if (toolChoice) {
    ret.tool_choice = toolChoice.tool_choice;
    ret.allowed_function_names = toolChoice.allowed_function_names;
  }

  const tools = options?.tools;
  if (tools) {
    ret.tools = convertToGeminiTools(tools as Record<string, any>[]);
  }
  // // Ensure tools are formatted properly for Gemini
  // const geminiTools = options?.tools
  //   ?.map((tool) => {
  //     if (
  //       "function" in tool &&
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       "parameters" in (tool.function as Record<string, any>)
  //     ) {
  //       // Tool is in OpenAI format. Convert to Gemini then return.

  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       const castTool = tool.function as Record<string, any>;
  //       const cleanedParameters = castTool.parameters;
  //       if ("$schema" in cleanedParameters) {
  //         delete cleanedParameters.$schema;
  //       }
  //       if ("additionalProperties" in cleanedParameters) {
  //         delete cleanedParameters.additionalProperties;
  //       }
  //       const toolInGeminiFormat: GeminiTool = {
  //         functionDeclarations: [
  //           {
  //             name: castTool.name,
  //             description: castTool.description,
  //             parameters: cleanedParameters,
  //           },
  //         ],
  //       };
  //       return toolInGeminiFormat;
  //     } else if ("functionDeclarations" in tool) {
  //       return tool;
  //     } else {
  //       return convertToGeminiTools([tool]);
  //     }
  //   })
  //   .filter((tool): tool is GeminiTool => tool !== null);

  // const structuredOutputTools = options?.tools
  //   ?.map((tool) => {
  //     if ("lc_namespace" in tool) {
  //       return tool;
  //     } else {
  //       return null;
  //     }
  //   })
  //   .filter((tool): tool is StructuredToolInterface => tool !== null);

  // if (
  //   structuredOutputTools &&
  //   structuredOutputTools.length > 0 &&
  //   geminiTools &&
  //   geminiTools.length > 0
  // ) {
  //   throw new Error(
  //     `Cannot mix structured tools with Gemini tools.\nReceived ${structuredOutputTools.length} structured tools and ${geminiTools.length} Gemini tools.`
  //   );
  // }
  // ret.tools = geminiTools ?? structuredOutputTools;

  return ret;
}

export function modelToFamily(
  modelName: string | undefined
): GoogleLLMModelFamily {
  if (!modelName) {
    return null;
  } else if (isModelGemini(modelName)) {
    return "gemini";
  } else {
    return null;
  }
}

export function validateModelParams(
  params: GoogleAIModelParams | undefined
): void {
  const testParams: GoogleAIModelParams = params ?? {};
  const model = testParams.model ?? testParams.modelName;
  switch (modelToFamily(model)) {
    case "gemini":
      return validateGeminiParams(testParams);
    default:
      throw new Error(
        `Unable to verify model params: ${JSON.stringify(params)}`
      );
  }
}

export function copyAndValidateModelParamsInto(
  params: GoogleAIModelParams | undefined,
  target: GoogleAIModelParams
): GoogleAIModelParams {
  copyAIModelParamsInto(params, undefined, target);
  validateModelParams(target);
  return target;
}
