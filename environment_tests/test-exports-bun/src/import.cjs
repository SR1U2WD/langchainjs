async function test() {
  const { default: assert } = await import("assert");
  const { OpenAI } = await import("langchain/llms/openai");
  const { LLMChain } = await import("langchain/chains");
  const { ChatPromptTemplate } = await import("langchain/prompts");
  const { loadPrompt } = await import("langchain/prompts/load");
  const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
  const { OpenAIEmbeddings } = await import("langchain/embeddings/openai");
  const { Document } = await import("langchain/document");
  const { CSVLoader } = await import("langchain/document_loaders/fs/csv");

  // Test exports
  assert(typeof OpenAI === "function");
  assert(typeof LLMChain === "function");
  assert(typeof loadPrompt === "function");
  assert(typeof ChatPromptTemplate === "function");
  assert(typeof MemoryVectorStore === "function");

  const vs = new MemoryVectorStore(
    new OpenAIEmbeddings({ openAIApiKey: "sk-XXXX" }),
  );

  await vs.addVectors(
    [
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      new Document({
        pageContent: "a",
      }),
      new Document({
        pageContent: "b",
      }),
    ],
  );

  assert((await vs.similaritySearchVectorWithScore([0, 0, 1], 1)).length === 1);

  // Test CSVLoader
  const loader = new CSVLoader(new Blob(["a,b,c\n1,2,3\n4,5,6"]));

  const docs = await loader.load();

  assert(docs.length === 2);
}

test()
  .then(() => console.log("success"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
