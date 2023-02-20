import { v4 as uuidv4 } from 'uuid';
import type {
  ChromaClient as ChromaClientT,
} from "chromadb";

import { Embeddings } from "../embeddings/base";

import { DocStore, VectorStore } from "./base";
import { Document } from "../document";

let ChromaClient: typeof ChromaClientT | null = null;

try {
  // eslint-disable-next-line global-require,import/no-extraneous-dependencies
  ({ ChromaClient } = require("chromadb"));
} catch {
  // ignore error
}

export interface ChromaLibArgs {
  url?: string;
  numDimensions?: number;
  collectionName: string,
}

export class Chroma extends VectorStore {
  index?: ChromaClientT;
  
  docstore: DocStore;

  args: ChromaLibArgs;

  collectionName: string;

  url: string;

  constructor(
    args: ChromaLibArgs,
    embeddings: Embeddings,
    docstore: DocStore,
    index?: ChromaClientT,
  ) {
    super(embeddings);
    this.index = index;
    this.args = args;
    this.embeddings = embeddings;
    this.docstore = docstore;
    this.collectionName = args.collectionName;
    this.url = args.url || "http://localhost:8000";
  }

  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent);
    await this.addVectors(await this.embeddings.embedDocuments(texts), documents);
  }

  async addVectors(vectors: number[][], documents: Document[]) {
    if (vectors.length === 0) {
      return;
    }
    if (!this.index) {
      if (this.args.numDimensions === undefined) {
        this.args.numDimensions = vectors[0].length;
      }
      if (ChromaClient === null) {
        throw new Error(
          "Please install chromadb as a dependency with, e.g. `npm install -S chromadb`"
        );
      }
      this.index = new ChromaClient(this.url);
      try {
        await this.index.createCollection(this.collectionName);
      } catch {
        // ignore error
      }
      
    }
    if (vectors.length !== documents.length) {
      throw new Error(`Vectors and metadatas must have the same length`);
    }
    if (vectors[0].length !== this.args.numDimensions) {
      throw new Error(
        `Vectors must have the same length as the number of dimensions (${this.args.numDimensions})`
      );
    }

    const collection = await this.index.getCollection(this.collectionName);
    for (let i = 0; i < vectors.length; i += 1) {
      await collection.add(
        i.toString(),
        vectors[i]
      )
      this.docstore[i] = documents[i];
    }
  }

  async similaritySearchVectorWithScore(query: number[], k: number) {
    if (!this.index) {
      throw new Error(
        "Vector store not initialised yet. Try calling `addTexts` first."
      );
    }
    const collection = await this.index.getCollection(this.collectionName);
    const result = await collection.query(query, k);
    const {ids, distances} = result;

    // ids comes back as a list of lists, so we need to flatten it
    let takeIds = ids[0]

    var results = [];
    for (let i = 0; i < takeIds.length; i += 1) {
      takeIds[i] = parseInt(takeIds[i]);
      results.push([this.docstore[takeIds[i]], distances[i]] as [Document, number]);
    }
    return results;
  }

  static async fromTexts(
    texts: string[],
    metadatas: object[],
    embeddings: Embeddings,
    collectionName: string,
    url?: string
  ): Promise<Chroma> {
    const docs = [];
    for (let i = 0; i < texts.length; i += 1) {
      const newDoc = new Document({
        pageContent: texts[i],
        metadata: metadatas[i],
      });
      docs.push(newDoc);
    }
    return Chroma.fromDocuments(docs, embeddings, collectionName, url);
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: Embeddings,
    collectionName?: string,
    url?: string
  ): Promise<Chroma> {
    if (ChromaClient === null) {
      throw new Error(
        "Please install chromadb as a dependency with, e.g. `npm install -S chromadb`"
      );
    }
    collectionName = ensureCollectionName(collectionName);

    const args: ChromaLibArgs = {
      collectionName: collectionName,
      url: url
    };
    const instance = new this(args, embeddings, {});
    await instance.addDocuments(docs);
    return instance;
  }
}

function ensureCollectionName(collectionName?: string) {
  if (!collectionName) {
    collectionName = "langchain-" + uuidv4()
  }
  return collectionName
}