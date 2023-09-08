import { GoogleVertexAILLMConnection } from "../../util/googlevertexai-connection.js";
import {
  WebGoogleAuthOptions,
  WebGoogleAuth,
} from "../../util/googlevertexai-webauth.js";
import { BaseChatGoogleVertexAI, GoogleVertexAIChatInput } from "./common.js";

/**
 * Enables calls to the Google Cloud's Vertex AI API to access
 * Large Language Models in a chat-like fashion.
 *
 * To use, you will need to have one of the following authentication
 * methods in place:
 * - You are logged into an account permitted to the Google Cloud project
 *   using Vertex AI.
 * - You are running this on a machine using a service account permitted to
 *   the Google Cloud project using Vertex AI.
 * - The `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set to the
 *   path of a credentials file for a service account permitted to the
 *   Google Cloud project using Vertex AI.
 */
export class ChatGoogleVertexAI extends BaseChatGoogleVertexAI<WebGoogleAuthOptions> {
  constructor(fields?: GoogleVertexAIChatInput<WebGoogleAuthOptions>) {
    super(fields);

    this.connection = new GoogleVertexAILLMConnection(
      { ...fields, ...this },
      this.caller,
      new WebGoogleAuth(fields?.authOptions)
    );
  }
}

export {
  ChatExample,
  GoogleVertexAIChatAuthor,
  GoogleVertexAIChatInput,
  GoogleVertexAIChatInstance,
  GoogleVertexAIChatMessage,
  GoogleVertexAIChatMessageFields,
  GoogleVertexAIChatPrediction,
} from "./common.js";
