import neo4j from "neo4j-driver";
import * as uuid from "uuid";
import { Document } from "../document.js";
import { Embeddings } from "../embeddings/base.js";
import { VectorStore } from "./base.js";

export enum SearchType {
  VECTOR = "vector",
  HYBRID = "hybrid",
}

export enum DistanceStrategy {
  EUCLIDEAN_DISTANCE = "euclidean",
  COSINE = "cosine",
}

interface Neo4jVectorStoreArgs {
  url: string;
  username: string;
  password: string;
  database?: string;
  preDeleteCollection?: boolean;
  textNodeProperty?: string;
  textNodeProperties?: string[];
  embeddingNodeProperty?: string;
  keywordIndexName?: string;
  indexName?: string;
  searchType?: SearchType;
  retrievalQuery?: string;
  nodeLabel?: string;
  createIdIndex?: boolean;
}

const DEFAULT_SEARCH_TYPE = SearchType.VECTOR;
const DEFAULT_DISTANCE_STRATEGY = DistanceStrategy.COSINE;

export class Neo4jVectorStore extends VectorStore {
  private driver: neo4j.Driver;

  private database: string;

  private preDeleteCollection: boolean;

  private nodeLabel: string;

  private embeddingNodeProperty: string;

  private embeddingDimension: number;

  private textNodeProperty: string;

  private keywordIndexName: string;

  private indexName: string;

  private retrievalQuery: string;

  private distanceStrategy: DistanceStrategy = DEFAULT_DISTANCE_STRATEGY;

  _vectorstoreType(): string {
    return "neo4jvector";
  }

  constructor(embeddings: Embeddings, config: Neo4jVectorStoreArgs) {
    super(embeddings, config);
  }

  static async initialize(
    embeddings: Embeddings,
    config: Neo4jVectorStoreArgs
  ) {
    const store = new Neo4jVectorStore(embeddings, config);
    await store._initializeDriver(config);
    await store._verifyConnectivity();

    const {
      preDeleteCollection = false,
      nodeLabel = "Chunk",
      textNodeProperty = "text",
      embeddingNodeProperty = "embedding",
      keywordIndexName = "keyword",
      indexName = "vector",
      retrievalQuery = "",
    } = config;

    store.embeddingDimension = (await embeddings.embedQuery("foo")).length;
    store.preDeleteCollection = preDeleteCollection;
    store.nodeLabel = nodeLabel;
    store.textNodeProperty = textNodeProperty;
    store.embeddingNodeProperty = embeddingNodeProperty;
    store.keywordIndexName = keywordIndexName;
    store.indexName = indexName;
    store.retrievalQuery = retrievalQuery;

    if (store.preDeleteCollection) {
      await store._dropIndex();
    }

    return store;
  }

  async _initializeDriver({
    url,
    username,
    password,
    database = "neo4j",
  }: Neo4jVectorStoreArgs) {
    try {
      this.driver = neo4j.driver(url, neo4j.auth.basic(username, password));
      this.database = database;
    } catch (error) {
      throw new Error(
        "Could not create a Neo4j driver instance. Please check the connection details."
      );
    }
  }

  async _verifyConnectivity() {
    await this.driver.verifyAuthentication();
  }

  async close() {
    await this.driver.close();
  }

  async _dropIndex() {
    try {
      await this.query(`
        MATCH (n:${this.nodeLabel})
        CALL {
          WITH n
          DETACH DELETE n
        }
        IN TRANSACTIONS OF 10000 ROWS;
      `);
      await this.query(`DROP INDEX ${this.indexName}`);
    } catch (error) {
      console.error("An error occurred while dropping the index:", error);
    }
  }

  async query(query: string, params: any = {}): Promise<any[] | undefined> {
    try {
      const result = await this.driver.executeQuery(query, params, {
        database: this.database,
      });
      return toObjects(result.records);
    } catch (error) {
      // ignore errors
    }
    return undefined;
  }

  static async fromTexts(
    texts: string[],
    metadatas: any,
    embeddings: Embeddings,
    config: Neo4jVectorStoreArgs
  ): Promise<Neo4jVectorStore> {
    const docs = [];

    for (let i = 0; i < texts.length; i += 1) {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      const newDoc = new Document({
        pageContent: texts[i],
        metadata: metadata,
      });
      docs.push(newDoc);
    }

    return Neo4jVectorStore.fromDocuments(docs, embeddings, config);
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: Embeddings,
    config: Neo4jVectorStoreArgs
  ): Promise<Neo4jVectorStore> {
    const { searchType = DEFAULT_SEARCH_TYPE, createIdIndex = true } = config;

    const store = await this.initialize(embeddings, config);

    let embeddingDimension = await store.retrieveExistingIndex();

    if (!embeddingDimension) {
      await store.createNewIndex();
    } else if (store.embeddingDimension !== embeddingDimension.low) {
      throw new Error(
        `Index with name "${store.indexName}" already exists. The provided embedding function and vector index dimensions do not match.
        Embedding function dimension: ${store.embeddingDimension}
        Vector index dimension: ${embeddingDimension}`
      );
    }

    if (searchType === SearchType.HYBRID) {
      const ftsNodeLabel = await store.retrieveExistingFtsIndex();

      if (!ftsNodeLabel) {
        throw Error(
          "The specified keyword index name does not exist. Make sure to check if you spelled it correctly"
        );
      } else {
        if (ftsNodeLabel !== store.nodeLabel) {
          throw Error(
            "Vector and keyword index don't index the same node label"
          );
        }
      }
    }

    if (createIdIndex) {
      await store.query(
        `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${store.nodeLabel}) REQUIRE n.id IS UNIQUE;`
      );
    }

    await store.addDocuments(docs);

    return store;
  }

  static async fromExistingIndex(
    embeddings: Embeddings,
    config: Neo4jVectorStoreArgs
  ) {
    let { searchType = DEFAULT_SEARCH_TYPE, keywordIndexName = "keyword" } =
      config;

    if (searchType === SearchType.HYBRID && !keywordIndexName) {
      throw Error(
        "keyword_index name has to be specified when using hybrid search option"
      );
    }

    const store = await this.initialize(embeddings, config);

    const embeddingDimension = await store.retrieveExistingIndex();

    if (!embeddingDimension) {
      throw Error(
        "The specified vector index name does not exist. Make sure to check if you spelled it correctly"
      );
    }

    if (store.embeddingDimension !== embeddingDimension) {
      throw new Error(
        `The provided embedding function and vector index dimensions do not match.
         Embedding function dimension: ${store.embeddingDimension}
         Vector index dimension: ${embeddingDimension}`
      );
    }

    if (searchType === SearchType.HYBRID) {
      const ftsNodeLabel = await store.retrieveExistingFtsIndex();

      if (!ftsNodeLabel) {
        throw Error(
          "The specified keyword index name does not exist. Make sure to check if you spelled it correctly"
        );
      } else {
        if (ftsNodeLabel !== store.nodeLabel) {
          throw Error(
            "Vector and keyword index don't index the same node label"
          );
        }
      }
    }

    return store;
  }

  static async fromExistingGraph(
    embeddings: Embeddings,
    config: Neo4jVectorStoreArgs
  ) {
    let {
      textNodeProperties = [],
      embeddingNodeProperty,
      searchType = DEFAULT_SEARCH_TYPE,
      retrievalQuery = "",
      nodeLabel,
    } = config;

    if (textNodeProperties.length === 0) {
      throw Error(
        "Parameter `text_node_properties` must not be an empty array"
      );
    }

    if (!retrievalQuery) {
      config.retrievalQuery = `
        RETURN reduce(str='', k IN ${textNodeProperties} |
        str + '\\n' + k + ': ' + coalesce(node[k], '')) AS text,
        node {.*, \`${embeddingNodeProperty}\`: Null, id: Null, ${textNodeProperties
        .map((prop) => `\`${prop}\`: Null`)
        .join(", ")} } AS metadata, score
      `;
    }

    const store = await this.initialize(embeddings, config);

    let embeddingDimension = await store.retrieveExistingIndex();

    if (!embeddingDimension) {
      embeddingDimension = await store.createNewIndex();
    } else if (store.embeddingDimension !== embeddingDimension) {
      throw new Error(
        `Index with name ${store.indexName} already exists. The provided embedding function and vector index dimensions do not match.\nEmbedding function dimension: ${store.embeddingDimension}\nVector index dimension: ${embeddingDimension}`
      );
    }

    if (searchType === SearchType.HYBRID) {
      const ftsNodeLabel = await store.retrieveExistingFtsIndex(
        textNodeProperties
      );

      if (!ftsNodeLabel) {
        await store.createNewKeywordIndex(textNodeProperties);
      } else {
        if (ftsNodeLabel !== store.nodeLabel) {
          throw Error(
            "Vector and keyword index don't index the same node label"
          );
        }
      }
    }

    while (true) {
      const fetchQuery = `
        MATCH (n:\`${nodeLabel}\`)
        WHERE n.${embeddingNodeProperty} IS null
        AND any(k in $props WHERE n[k] IS NOT null)
        RETURN elementId(n) AS id, reduce(str='', k IN $props |
        str + '\\n' + k + ':' + coalesce(n[k], '')) AS text
        LIMIT 1000
      `;

      const data = await store.query(fetchQuery, { props: textNodeProperties });

      if (!data) {
        continue;
      }

      const textEmbeddings = await embeddings.embedDocuments(
        data.map((el) => el.text)
      );

      const params = {
        data: data.map((el, index) => ({
          id: el.id,
          embedding: textEmbeddings[index],
        })),
      };

      await store.query(
        `
        UNWIND $data AS row
        MATCH (n:\`${nodeLabel}\`)
        WHERE elementId(n) = row.id
        CALL db.create.setVectorProperty(n, '${embeddingNodeProperty}', row.embedding)
        YIELD node RETURN count(*)
      `,
        params
      );

      if (data.length < 1000) {
        break;
      }
    }

    return store;
  }

  async createNewIndex(): Promise<void> {
    const indexQuery = `
      CALL db.index.vector.createNodeIndex(
        $index_name,
        $node_label,
        $embedding_node_property,
        toInteger($embedding_dimension),
        $similarity_metric
      )
    `;

    const parameters = {
      index_name: this.indexName,
      node_label: this.nodeLabel,
      embedding_node_property: this.embeddingNodeProperty,
      embedding_dimension: this.embeddingDimension,
      similarity_metric: this.distanceStrategy,
    };

    await this.query(indexQuery, parameters);
  }

  async retrieveExistingIndex() {
    let indexInformation = await this.query(
      `
        SHOW INDEXES YIELD name, type, labelsOrTypes, properties, options
        WHERE type = 'VECTOR' AND (name = $index_name
        OR (labelsOrTypes[0] = $node_label AND
        properties[0] = $embedding_node_property))
        RETURN name, labelsOrTypes, properties, options
      `,
      {
        index_name: this.indexName,
        node_label: this.nodeLabel,
        embedding_node_property: this.embeddingNodeProperty,
      }
    );

    if (indexInformation) {
      indexInformation = this.sortByIndexName(indexInformation, this.indexName);

      try {
        this.indexName = indexInformation[0]["name"];
        this.nodeLabel = indexInformation[0]["labelsOrTypes"][0];
        this.embeddingNodeProperty = indexInformation[0]["properties"][0];

        const embeddingDimension =
          indexInformation[0]["options"]["indexConfig"]["vector.dimensions"];
        return embeddingDimension;
      } catch (error) {
        return null;
      }
    }
  }

  async retrieveExistingFtsIndex(
    textNodeProperties: string[] = []
  ): Promise<string | null> {
    const indexInformation = await this.query(
      `
      SHOW INDEXES YIELD name, type, labelsOrTypes, properties, options
      WHERE type = 'FULLTEXT' AND (name = $keyword_index_name
      OR (labelsOrTypes = [$node_label] AND
      properties = $text_node_property))
      RETURN name, labelsOrTypes, properties, options
    `,
      {
        keyword_index_name: this.keywordIndexName,
        node_label: this.nodeLabel,
        text_node_property:
          textNodeProperties.length > 0
            ? textNodeProperties
            : [this.textNodeProperty],
      }
    );

    if (indexInformation) {
      // Sort the index information by index name
      const sortedIndexInformation = this.sortByIndexName(
        indexInformation,
        this.indexName
      );

      try {
        this.keywordIndexName = sortedIndexInformation[0].name;
        this.textNodeProperty = sortedIndexInformation[0].properties[0];
        const nodeLabel = sortedIndexInformation[0].labelsOrTypes[0];
        return nodeLabel;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  async createNewKeywordIndex(
    textNodeProperties: string[] = []
  ): Promise<void> {
    const nodeProps =
      textNodeProperties.length > 0
        ? textNodeProperties
        : [this.textNodeProperty];

    // Construct the Cypher query to create a new full text index
    const ftsIndexQuery = `
      CREATE FULLTEXT INDEX ${this.keywordIndexName}
      FOR (n:\`${this.nodeLabel}\`) ON EACH
      [${nodeProps.map((prop) => `n.\`${prop}\``).join(", ")}]
    `;

    await this.query(ftsIndexQuery);
  }

  sortByIndexName(
    values: Array<{ [key: string]: any }>,
    indexName: string
  ): Array<{ [key: string]: any }> {
    return values.sort(
      (a, b) =>
        (a.index_name === indexName ? -1 : 0) -
        (b.index_name === indexName ? -1 : 0)
    );
  }

  async addVectors(
    vectors: number[][],
    documents: Document[],
    metadatas?: Record<string, any>[],
    ids?: string[]
  ): Promise<string[]> {
    if (!ids) {
      ids = documents.map(() => uuid.v1());
    }

    if (!metadatas) {
      metadatas = documents.map(() => ({}));
    }

    const importQuery = `
      UNWIND $data AS row
      CALL {
        WITH row
        MERGE (c:\`${this.nodeLabel}\` {id: row.id})
        WITH c, row
        CALL db.create.setVectorProperty(c, '${this.embeddingNodeProperty}', row.embedding)
        YIELD node
        SET c.\`${this.textNodeProperty}\` = row.text
        SET c += row.metadata
      } IN TRANSACTIONS OF 1000 ROWS
    `;

    const parameters = {
      data: documents.map(({ pageContent, metadata }, index) => {
        return {
          text: pageContent,
          metadata: metadatas ? metadatas[index] : metadata,
          embedding: vectors[index],
          id: ids ? ids[index] : null,
        };
      }),
    };

    await this.query(importQuery, parameters);

    return ids;
  }

  async addDocuments(documents: Document[]): Promise<string[]> {
    const texts = documents.map(({ pageContent }) => pageContent);

    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents
    );
  }

  async similaritySearchVectorWithScore(
    vector: number[],
    k: number = 4
  ): Promise<[Document, number][]> {
    const defaultRetrieval = `
    RETURN node.${this.textNodeProperty} AS text, score,
    node {.*, ${this.textNodeProperty}: Null,
    ${this.embeddingNodeProperty}: Null, id: Null } AS metadata
    `;

    const retrievalQuery = this.retrievalQuery
      ? this.retrievalQuery
      : defaultRetrieval;

    const readQuery = `
      CALL db.index.vector.queryNodes($index, $k, $embedding)
      YIELD node, score ${retrievalQuery}
    `;

    const parameters = { index: this.indexName, k, embedding: vector };

    const results = await this.query(readQuery, parameters);

    if (results) {
      const docs: [Document, number][] = results.map((result: any) => {
        return [
          new Document({
            pageContent: result.text,
            metadata: Object.fromEntries(
              Object.entries(result.metadata).filter(([_, v]) => v !== null)
            ),
          }),
          result.score,
        ];
      });

      return docs;
    }

    return [];
  }
}

function toObjects(records: neo4j.Record[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordValues: Record<string, any>[] = records.map((record) => {
    const rObj = record.toObject();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: { [key: string]: any } = {};
    Object.keys(rObj).forEach((key) => {
      out[key] = itemIntToString(rObj[key]);
    });
    return out;
  });
  return recordValues;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemIntToString(item: any): any {
  if (neo4j.isInt(item)) return item.toString();
  if (Array.isArray(item)) return item.map((ii) => itemIntToString(ii));
  if (["number", "string", "boolean"].indexOf(typeof item) !== -1) return item;
  if (item === null) return item;
  if (typeof item === "object") return objIntToString(item);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function objIntToString(obj: any) {
  const entry = extractFromNeoObjects(obj);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let newObj: any = null;
  if (Array.isArray(entry)) {
    newObj = entry.map((item) => itemIntToString(item));
  } else if (entry !== null && typeof entry === "object") {
    newObj = {};
    Object.keys(entry).forEach((key) => {
      newObj[key] = itemIntToString(entry[key]);
    });
  }
  return newObj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromNeoObjects(obj: any) {
  if (
    // eslint-disable-next-line
    obj instanceof (neo4j.types.Node as any) ||
    // eslint-disable-next-line
    obj instanceof (neo4j.types.Relationship as any)
  ) {
    return obj.properties;
    // eslint-disable-next-line
  } else if (obj instanceof (neo4j.types.Path as any)) {
    // eslint-disable-next-line
    return [].concat.apply<any[], any[], any[]>([], extractPathForRows(obj));
  }
  return obj;
}

function extractPathForRows(path: neo4j.Path) {
  let { segments } = path;
  // Zero length path. No relationship, end === start
  if (!Array.isArray(path.segments) || path.segments.length < 1) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    segments = [{ ...path, end: null } as any];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return segments.map((segment: any) =>
    [
      objIntToString(segment.start),
      objIntToString(segment.relationship),
      objIntToString(segment.end),
    ].filter((part) => part !== null)
  );
}
