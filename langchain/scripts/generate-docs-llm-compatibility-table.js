import path from "path";
import { BaseChatModel } from "../dist/chat_models/base.js";
import { BaseLLM } from "../dist/llms/base.js";
import fs from "fs/promises";
import { exec } from "child_process";

/**
 * Chat model classes to ignore.
 */
const CHAT_MODEL_IGNORE = [
  "FakeListChatModel",
  "BaseChatModel",
  "SimpleChatModel",
  "BaseChatIflytekXinghuo",
  "BaseChatGoogleVertexAI",
];
/**
 * LLM classes to ignore.
 */
const LLM_IGNORE = [
  "BaseLLM",
  "LLM",
  "BaseSageMakerContentHandler",
  "FakeListLLM",
  "BaseGoogleVertexAI",
];

/**
 * The base text for the llm docs.
 */
const LLM_DOC_TEXT = `---
sidebar_position: 0
sidebar_class_name: hidden
---

# LLMs

<!-- This file is autogenerated. Do not edit directly. -->
<!-- See \`scripts/model-docs.table.js\` for details -->

## Features (natively supported)

All LLMs implement the Runnable interface, which comes with default implementations of all methods, ie. \`invoke\`, \`batch\`, \`stream\`, \`map\`. This gives all LLMs basic support for invoking, streaming, batching and mapping requests, which by default is implemented as below:

- _Streaming_ support defaults to returning an \`AsyncIterator\` of a single value, the final result returned by the underlying LLM provider. This obviously doesn't give you token-by-token streaming, which requires native support from the LLM provider, but ensures your code that expects an iterator of tokens can work for any of our LLM integrations.
- _Batch_ support defaults to calling the underlying LLM in parallel for each input. The concurrency can be controlled with the \`maxConcurrency\` key in \`RunnableConfig\`.
- _Map_ support defaults to calling \`.invoke\` across all instances of the array which it was called on.

Each LLM integration can optionally provide native implementations for invoke, streaming or batch, which, for providers that support it, can be more efficient. The table shows, for each integration, which features have been implemented with native support.
`;

/**
 * The base text for the chat model docs.
 */
const CHAT_MODEL_DOC_TEXT = `---
sidebar_position: 1
sidebar_class_name: hidden
---

# Chat models

<!-- This file is autogenerated. Do not edit directly. -->
<!-- See \`scripts/model-docs.table.js\` for details -->

## Features (natively supported)

All ChatModels implement the Runnable interface, which comes with default implementations of all methods, ie. \`invoke\`, \`batch\`, \`stream\`. This gives all ChatModels basic support for invoking, streaming and batching, which by default is implemented as below:

- _Streaming_ support defaults to returning an \`AsyncIterator\` of a single value, the final result returned by the underlying ChatModel provider. This obviously doesn't give you token-by-token streaming, which requires native support from the ChatModel provider, but ensures your code that expects an iterator of tokens can work for any of our ChatModel integrations.
- _Batch_ support defaults to calling the underlying ChatModel in parallel for each input. The concurrency can be controlled with the \`maxConcurrency\` key in \`RunnableConfig\`.
- _Map_ support defaults to calling \`.invoke\` across all instances of the array which it was called on.

Each ChatModel integration can optionally provide native implementations to truly enable invoke, streaming or batching requests. The table shows, for each integration, which features have been implemented with native support.
`;

/**
 * Build code // documentation paths to rewrite.
 */
const CWD = process.cwd();
const LLM_DOC_INDEX_PATH = path.join(CWD, "..", "./docs/docs/integrations/llms/index.mdx");
const CHAT_MODELS_DOC_INDEX_PATH = path.join(CWD, "..", "./docs/docs/integrations/chat/index.mdx");
const CHAT_MODEL_DIRECTORY = path.join(CWD, "./dist/chat_models");
const LLM_DIRECTORY = path.join(CWD, "./dist/llms");

/**
 * Fetch all files which are not .test.ts/.cjs/.d.ts from a directory.
 * @param {string} pattern
 * @param { nodir: boolean, cwd: string } options
 */
const getAllJSFilesInDir = async (pattern, options) => {
  let fileList = [];

  async function walk(currentPath) {
    let files = await fs.readdir(currentPath);
    for (let file of files) {
      let fullPath = path.join(currentPath, file);
      let fileStat = await fs.stat(fullPath);

      if (fileStat.isDirectory()) {
        await walk(fullPath);
      } else {
        const ext = path.extname(fullPath);
        if (ext === ".js") {
          fileList.push(fullPath);
        }
      }
    }
  }

  await walk(options.cwd || process.cwd());
  const filteredFileList = fileList.filter(file => file.match(new RegExp(pattern))).map((file) => path.basename(file))
  return filteredFileList
};

/**
 * Verifies the arg being passed is a class, and is a subclass of BaseChatModel or BaseLLM.
 * @param {string} item
 */
const isClass = (item) => {
  const className = item.name;

  if (CHAT_MODEL_IGNORE.includes(className) || LLM_IGNORE.includes(className)) {
    return false;
  }

  // Verify the item is a class
  if (
    typeof item !== "function" ||
    !/^class\s/.test(Function.prototype.toString.call(item))
  ) {
    return false;
  }

  // Verify the item is a subclass of BaseChatModel or BaseLLM
  let prototype = Object.getPrototypeOf(item);
  while (prototype) {
    if (prototype === BaseChatModel || prototype === BaseLLM) {
      return true;
    }
    prototype = Object.getPrototypeOf(prototype);
  }

  return false;
};

/**
 * Create the MD table.
 * @param {Array<{name: string, hasStreamImplemented: boolean, hasInvokeImplemented: boolean, hasBatchImplemented: boolean}>} data
 * @returns {string}
 */
const createTable = (data) => {
  const header = `
| Model | Invoke | Stream | Batch |
| :--- | :---: | :---: | :---: |`;

  const rows = data.map((item) => {
    const r = `| ${item.name} | ${item.hasInvokeImplemented ? "✅" : "❌"} | ${
      item.hasStreamImplemented ? "✅" : "❌"
    } | ${item.hasBatchImplemented ? "✅" : "❌"} |`;
    return r;
  });

  return [header, ...rows].join("\n");
};

/**
 * Check the provided class has implemented the required methods.'
 * @param {string} directory
 * @param {string} file
 * @param {"chat" | "llm"} type
 */
const checkClassMethods = async (
  directory,
  file,
  type,
) => {
  const fullFilePath = path.join(directory, file);
  let all;
  try {
    all = await import(fullFilePath);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      return [];
    } else {
      throw error;
    }
  }

  const classMethodImplementations = Object.entries(all)
    .filter(([_, value]) => isClass(value))
    .map(([key, value]) => {
      const instance = value;
      let hasStreamImplemented = false;
      const hasInvokeImplemented = instance.prototype.invoke !== undefined;
      const hasBatchImplemented = instance.prototype.batch !== undefined;

      if (instance.prototype._streamResponseChunks) {
        if (type === "chat") {
          hasStreamImplemented = instance.prototype._streamResponseChunks !==
            BaseChatModel.prototype._streamResponseChunks;
        } else {
          hasStreamImplemented = instance.prototype._streamResponseChunks !==
            BaseLLM.prototype._streamResponseChunks;
        }
      }

      return {
        name: key,
        hasStreamImplemented,
        hasInvokeImplemented,
        hasBatchImplemented,
      };
    });

  return classMethodImplementations;
};

export async function main() {
  const pattern = "^(?!.*(?:\.test\.ts|\.cjs|\.d\.ts)$).*";
  const chatModelFiles = await getAllJSFilesInDir(pattern, { nodir: true, cwd: CHAT_MODEL_DIRECTORY });
  const llmFiles = await getAllJSFilesInDir(pattern, { nodir: true, cwd: LLM_DIRECTORY });

  const [chatClassCompatibility, llmClassCompatibility] = await Promise.all([
    Promise.all(
      chatModelFiles.map((file) =>
        checkClassMethods(CHAT_MODEL_DIRECTORY, file, "chat")
      )
    ),
    Promise.all(
      llmFiles.map((file) => checkClassMethods(LLM_DIRECTORY, file, "llm"))
    ),
  ]);

  const chatTable = createTable(chatClassCompatibility.flat());
  const fullChatModelFileContent = [CHAT_MODEL_DOC_TEXT, chatTable].join(
    "\n\n"
  );
  const llmTable = createTable(llmClassCompatibility.flat());
  const fullLLMFileContent = [LLM_DOC_TEXT, llmTable].join("\n\n");

  await Promise.all([
    fs.writeFile(CHAT_MODELS_DOC_INDEX_PATH, fullChatModelFileContent),
    fs.writeFile(LLM_DOC_INDEX_PATH, fullLLMFileContent),
  ]);

  await Promise.all([
    exec(`prettier --write ${CHAT_MODELS_DOC_INDEX_PATH}`),
    exec(`prettier --write ${LLM_DOC_INDEX_PATH}`)
  ]);
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error('Error generating docs table: ', e);
  }
})();
