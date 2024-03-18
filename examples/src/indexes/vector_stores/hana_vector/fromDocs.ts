import hanaClient from '@sap/hana-client';
import { HanaDB, HanaDBArgs} from "@langchain/community/vectorstores/hanavector";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { setTimeout } from "timers/promises";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { CharacterTextSplitter } from "langchain/text_splitter";


// Connection parameters
const connectionParams = {
    host : process.env.HOST,   
    port : process.env.PORT,   
    uid  : process.env.UID,        
    pwd  : process.env.PWD
  };
  
const embeddings = new OpenAIEmbeddings();
//connet to hanaDB
const client = hanaClient.createConnection();
client.connect(connectionParams);
const args: HanaDBArgs = {
    connection: client,
    tableName: "test_fromDocs",
    };
// Load documents from file
const loader = new TextLoader("./state_of_the_union.txt");
const rawDocuments = await loader.load();
const splitter = new CharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0
});
const documents = await splitter.splitDocuments(rawDocuments);
// Create a LangChain VectorStore interface for the HANA database and specify the table (collection) to use in args.
const vectorStore = new HanaDB(embeddings, args);
// Delete already existing documents from the table
await vectorStore.delete({filter : {}})
// add the loaded document chunks
await vectorStore.addDocuments(documents);
// sleep 5 seconds to make sure the documents are indexed.
await setTimeout(5000);

// similarity search (default:“Cosine Similarity”, options:["euclidean", "cosine"])
const query = "What did the president say about Ketanji Brown Jackson"
const docs = await vectorStore.similaritySearch(query, 2)
docs.forEach(doc => {
    console.log("-".repeat(80)); 
    console.log(doc.pageContent); 
});
/*
--------------------------------------------------------------------------------
One of the most serious constitutional responsibilities a President has is nominating someone to serve on the United States Supreme Court. 

And I did that 4 days ago, when I nominated Circuit Court of Appeals Judge Ketanji Brown Jackson. One of our nation’s top legal minds, who will continue Justice Breyer’s legacy of excellence.
--------------------------------------------------------------------------------
As I said last year, especially to our younger transgender Americans, I will always have your back as your President, so you can be yourself and reach your God-given potential. 

While it often appears that we never agree, that isn’t true. I signed 80 bipartisan bills into law last year. From preventing government shutdowns to protecting Asian-Americans from still-too-common hate crimes to reforming military justice
*/

//similiarity search using euclidean distance method
const argsL2d: HanaDBArgs = {
  connection: client,
  tableName: "test_fromDocs",
  distanceStrategy: 'euclidean'
  };
const vectorStoreL2d = new HanaDB(embeddings, argsL2d);
const docsL2d = await vectorStoreL2d.similaritySearch(query, 2)
docsL2d.forEach(docsL2d => {
  console.log("-".repeat(80)); 
  console.log(docsL2d.pageContent); 
});

// Output should be the same as the cosine similarity search method.

// Maximal Marginal Relevance Search (MMR)
const docsMMR = await vectorStore.maxMarginalRelevanceSearch(query, {k:2, fetchK: 20});
