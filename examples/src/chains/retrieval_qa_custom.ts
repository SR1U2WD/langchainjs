import { OpenAI } from "langchain/llms/openai";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from "fs";
import { PromptTemplate } from "langchain/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";

// Initialize the LLM to use to answer the question.
const model = new OpenAI({});
const text = fs.readFileSync("examples/state_of_the_union.txt", "utf8");
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
const docs = await textSplitter.createDocuments([text]);

// Default prompt used in the loadQAMapReduceChain for getting more fine grained context
// from returned relevant docs.
const qa_template =
  PromptTemplate.fromTemplate(`Use the following portion of a long document to see if any of the text is relevant to answer the question. 
Return any relevant text verbatim.
{context}
Question: {question}
Relevant text, if any:`);

// Create a new chain that uses the default prompt and the relevant docs.
const query_docs_chain = qa_template.pipe(model).pipe(new StringOutputParser());

// Default prompt used in the loadQAMapReduceChain for getting a final answer.
const combine_docs_prompt = PromptTemplate.fromTemplate(
  `Given the following extracted parts of a long document and a question, create a final answer. 
If you don't know the answer, just say that you don't know. Don't try to make up an answer.

QUESTION: {question}
=========
SUMMARIES: {summaries}
=========
FINAL ANSWER:`
);

// Create a new chain using the default prompt and an output parser.
const combine_docs_chain = combine_docs_prompt
  .pipe(model)
  .pipe(new StringOutputParser());

const query = "What did the president say about Justice Breyer?";

// Create a vector store retriever from the documents.
const vector_store_retriever = (
  await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings())
).asRetriever();
const relevant_docs = await vector_store_retriever.getRelevantDocuments(query);

const serialized_docs_content = relevant_docs.map((doc) => doc.pageContent);

// Perform a map over all the relevant docs and query the LLM.
const query_docs_chain_results = await Promise.all(
  serialized_docs_content.map(async (doc) => {
    const res = await query_docs_chain.invoke({
      context: doc,
      question: query,
    });
    return res;
  })
);

// Take the results from above, combine to a string and query the LLM.

const chain = RunnableSequence.from([
  {
    summaries: () => query_docs_chain_results.join("\n"),
    question: new RunnablePassthrough(),
  },
  combine_docs_chain,
]);

const result = await chain.invoke(query);

console.log({ result });
/*
{
  result: " The President thanked Justice Breyer for his service and acknowledged him as one of the nation's top legal minds whose legacy of excellence will be continued."
}
*/
