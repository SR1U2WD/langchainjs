import { Embeddings } from "../embeddings/base.js";
import { Document } from "../document.js";
import { BaseRetriever } from "../schema/index.js";

export class VectorStoreRetriever extends BaseRetriever {
  vectorStore: VectorStore;

  k = 4;

  constructor(fields: { vectorStore: VectorStore; k?: number }) {
    super();
    this.vectorStore = fields.vectorStore;
    this.k = fields.k ?? this.k;
  }

  async getRelevantTexts(query: string): Promise<Document[]> {
    const results = await this.vectorStore.similaritySearch(query, 4);
    return results;
  }
}

export abstract class VectorStore {
  embeddings: Embeddings;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(embeddings: Embeddings, _dbConfig: Record<string, any>) {
    this.embeddings = embeddings;
  }

  abstract addVectors(
    vectors: number[][],
    documents: Document[]
  ): Promise<void>;

  abstract addDocuments(documents: Document[]): Promise<void>;

  abstract similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: object
  ): Promise<[Document, number][]>;

  async similaritySearch(
    query: string,
    filter?: object,
    k = 4
  ): Promise<Document[]> {
    const results = await this.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      k,
      filter
    );

    return results.map((result) => result[0]);
  }

  async similaritySearchWithScore(
    query: string,
    filter?: object,
    k = 4
  ): Promise<[object, number][]> {
    return this.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      k,
      filter
    );
  }

  static fromTexts(
    _texts: string[],
    _metadatas: object[],
    _embeddings: Embeddings,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _dbConfig: Record<string, any>
  ): Promise<VectorStore> {
    throw new Error(
      "the Langchain vectorstore implementation you are using forgot to override this, please report a bug"
    );
  }

  static fromDocuments(
    _docs: Document[],
    _embeddings: Embeddings,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _dbConfig: Record<string, any>
  ): Promise<VectorStore> {
    throw new Error(
      "the Langchain vectorstore implementation you are using forgot to override this, please report a bug"
    );
  }

  asRetriever(k?: number): BaseRetriever {
    return new VectorStoreRetriever({ vectorStore: this, k });
  }
}

export abstract class SaveableVectorStore extends VectorStore {
  abstract save(directory: string): Promise<void>;

  static load(
    _directory: string,
    _embeddings: Embeddings
  ): Promise<SaveableVectorStore> {
    throw new Error("Not implemented");
  }
}
