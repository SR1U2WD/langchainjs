import * as uuid from "uuid";
import flatten from "flat";
import { VectorStore } from "./base.js";
import { Embeddings } from "../embeddings/base.js";
import { Document, DocumentInput } from "../document.js";
import { GoogleVertexAIConnection } from "../util/googlevertexai-connection.js";
import {
  AsyncCaller,
  AsyncCallerCallOptions,
  AsyncCallerParams,
} from "../util/async_caller.js";
import {
  GoogleVertexAIConnectionParams,
  GoogleVertexAIResponse,
} from "../types/googlevertexai-types.js";
import { Docstore } from "../schema/index.js";

export interface IdDocumentInput extends DocumentInput {
  id?: string;
}

export class IdDocument
  extends Document
  implements IdDocumentInput
{
  id?: string;

  constructor(fields: IdDocumentInput) {
    super(fields);
    this.id = fields.id;
  }
}

interface IndexEndpointConnectionParams extends GoogleVertexAIConnectionParams {
  indexEndpoint: string;
}

interface DeployedIndex {
  id: string;
  index: string;
  // There are other attributes, but we don't care about them right now
}

interface IndexEndpointResponse extends GoogleVertexAIResponse {
  data: {
    deployedIndexes: DeployedIndex[];
    publicEndpointDomainName: string;
    // There are other attributes, but we don't care about them right now
  };
}

class IndexEndpointConnection extends GoogleVertexAIConnection<
  AsyncCallerCallOptions,
  IndexEndpointResponse
> {
  indexEndpoint: string;

  constructor(fields: IndexEndpointConnectionParams, caller: AsyncCaller) {
    super(fields, caller);

    this.indexEndpoint = fields.indexEndpoint;
  }

  async buildUrl(): Promise<string> {
    const projectId = await this.auth.getProjectId();
    const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexEndpoints/${this.indexEndpoint}`;
    return url;
  }

  buildMethod() {
    return "GET";
  }

  async request(
    options: AsyncCallerCallOptions
  ): Promise<IndexEndpointResponse> {
    return this._request(undefined, options);
  }
}

export interface MatchingEngineDeleteParams {
  ids: string[];
}

interface RemoveDatapointParams extends GoogleVertexAIConnectionParams {
  index: string;
}

interface RemoveDatapointRequest {
  datapointIds: string[];
}

interface RemoveDatapointResponse extends GoogleVertexAIResponse {
  // Should be empty
}

class RemoveDatapointConnection extends GoogleVertexAIConnection<
  AsyncCallerCallOptions,
  RemoveDatapointResponse
> {
  index: string;

  constructor(fields: RemoveDatapointParams, caller: AsyncCaller) {
    super(fields, caller);

    this.index = fields.index;
  }

  async buildUrl(): Promise<string> {
    const projectId = await this.auth.getProjectId();
    const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexes/${this.index}:removeDatapoints`;
    return url;
  }

  buildMethod(): string {
    return "POST";
  }

  async request(
    datapointIds: string[],
    options: AsyncCallerCallOptions
  ): Promise<RemoveDatapointResponse> {
    const data: RemoveDatapointRequest = {
      datapointIds,
    };
    return this._request(data, options);
  }
}

interface UpsertDatapointParams extends GoogleVertexAIConnectionParams {
  index: string;
}

export interface Restriction {
  namespace: string;
  allowList?: string[];
  denyList?: string[];
}

interface CrowdingTag {
  crowdingAttribute: string;
}

interface IndexDatapoint {
  datapointId: string;
  featureVector: number[];
  restricts?: Restriction[];
  crowdingTag?: CrowdingTag;
}

interface UpsertDatapointRequest {
  datapoints: IndexDatapoint[];
}

interface UpsertDatapointResponse extends GoogleVertexAIResponse {
  // Should be empty
}

class UpsertDatapointConnection extends GoogleVertexAIConnection<
  AsyncCallerCallOptions,
  UpsertDatapointResponse
> {
  index: string;

  constructor(fields: UpsertDatapointParams, caller: AsyncCaller) {
    super(fields, caller);

    this.index = fields.index;
  }

  async buildUrl(): Promise<string> {
    const projectId = await this.auth.getProjectId();
    const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexes/${this.index}:upsertDatapoints`;
    return url;
  }

  buildMethod(): string {
    return "POST";
  }

  async request(
    datapoints: IndexDatapoint[],
    options: AsyncCallerCallOptions
  ): Promise<UpsertDatapointResponse> {
    const data: UpsertDatapointRequest = {
      datapoints,
    };
    return this._request(data, options);
  }
}

interface FindNeighborsConnectionParams extends GoogleVertexAIConnectionParams {
  indexEndpoint: string;

  deployedIndexId: string;
}

interface FindNeighborsRequestQuery {
  datapoint: {
    datapointId: string;
    featureVector: number[];
    restricts?: Restriction[];
  };
  neighborCount: number;
}

interface FindNeighborsRequest {
  deployedIndexId: string;
  queries: FindNeighborsRequestQuery[];
}

interface FindNeighborsResponseNeighbor {
  datapoint: {
    datapointId: string;
    crowdingTag: {
      crowdingTagAttribute: string;
    };
  };
  distance: number;
}

interface FindNeighborsResponseNearestNeighbor {
  id: string;
  neighbors: FindNeighborsResponseNeighbor[];
}

interface FindNeighborsResponse extends GoogleVertexAIResponse {
  data: {
    nearestNeighbors: FindNeighborsResponseNearestNeighbor[];
  };
}

class FindNeighborsConnection
  extends GoogleVertexAIConnection<
    AsyncCallerCallOptions,
    FindNeighborsResponse
  >
  implements FindNeighborsConnectionParams
{
  indexEndpoint: string;

  deployedIndexId: string;

  constructor(params: FindNeighborsConnectionParams, caller: AsyncCaller) {
    super(params, caller);

    this.indexEndpoint = params.indexEndpoint;
    this.deployedIndexId = params.deployedIndexId;
  }

  async buildUrl(): Promise<string> {
    const projectId = await this.auth.getProjectId();
    const url = `https://${this.endpoint}/${this.apiVersion}/projects/${projectId}/locations/${this.location}/indexEndpoints/${this.indexEndpoint}:findNeighbors`;
    return url;
  }

  buildMethod(): string {
    return "POST";
  }

  async request(
    request: FindNeighborsRequest,
    options: AsyncCallerCallOptions
  ): Promise<FindNeighborsResponse> {
    return this._request(request, options);
  }
}

export interface PublicAPIEndpointInfo {
  apiEndpoint?: string;

  deployedIndexId?: string;
}

export interface MatchingEngineArgs
  extends GoogleVertexAIConnectionParams,
    IndexEndpointConnectionParams,
    UpsertDatapointParams {
  docstore: Docstore;

  callerParams?: AsyncCallerParams;

  callerOptions?: AsyncCallerCallOptions;

  apiEndpoint?: string;

  deployedIndexId?: string;
}

export class MatchingEngine extends VectorStore implements MatchingEngineArgs {
  declare FilterType: Restriction[];

  /**
   * Docstore that retains the document, stored by ID
   */
  docstore: Docstore;

  /**
   * The host to connect to for queries and upserts.
   */
  apiEndpoint: string;

  apiVersion = "v1";

  endpoint = "us-central1-aiplatform.googleapis.com";

  location = "us-central1";

  /**
   * The id for the index endpoint
   */
  indexEndpoint: string;

  /**
   * The id for the index
   */
  index: string;

  /**
   * The id for the "deployed index", which is an identifier in the
   * index endpoint that references the index (but is not the index id)
   */
  deployedIndexId: string;

  callerParams: AsyncCallerParams;

  callerOptions: AsyncCallerCallOptions;

  caller: AsyncCaller;

  indexEndpointClient: IndexEndpointConnection;

  removeDatapointClient: RemoveDatapointConnection;

  upsertDatapointClient: UpsertDatapointConnection;

  constructor(embeddings: Embeddings, args: MatchingEngineArgs) {
    super(embeddings, args);

    this.embeddings = embeddings;
    this.docstore = args.docstore;

    this.apiEndpoint = args.apiEndpoint ?? this.apiEndpoint;
    this.deployedIndexId = args.deployedIndexId ?? this.deployedIndexId;

    this.apiVersion = args.apiVersion ?? this.apiVersion;
    this.endpoint = args.endpoint ?? this.endpoint;
    this.location = args.location ?? this.location;
    this.indexEndpoint = args.indexEndpoint ?? this.indexEndpoint;
    this.index = args.index ?? this.index;

    this.callerParams = args.callerParams ?? this.callerParams;
    this.callerOptions = args.callerOptions ?? this.callerOptions;
    this.caller = new AsyncCaller(this.callerParams || {});

    const indexClientParams: IndexEndpointConnectionParams = {
      endpoint: this.endpoint,
      location: this.location,
      apiVersion: this.apiVersion,
      indexEndpoint: this.indexEndpoint,
    };
    this.indexEndpointClient = new IndexEndpointConnection(
      indexClientParams,
      this.caller
    );

    const removeClientParams: RemoveDatapointParams = {
      endpoint: this.endpoint,
      location: this.location,
      apiVersion: this.apiVersion,
      index: this.index,
    };
    this.removeDatapointClient = new RemoveDatapointConnection(
      removeClientParams,
      this.caller
    );

    const upsertClientParams: UpsertDatapointParams = {
      endpoint: this.endpoint,
      location: this.location,
      apiVersion: this.apiVersion,
      index: this.index,
    };
    this.upsertDatapointClient = new UpsertDatapointConnection(
      upsertClientParams,
      this.caller
    );
  }

  _vectorstoreType(): string {
    return "googlevertexai";
  }

  async addDocuments(documents: Document[]): Promise<void> {
    const texts: string[] = documents.map((doc) => doc.pageContent);
    const vectors: number[][] = await this.embeddings.embedDocuments(texts);
    return this.addVectors(vectors, documents);
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    if (vectors.length !== documents.length) {
      throw new Error(`Vectors and metadata must have the same length`);
    }
    const datapoints: IndexDatapoint[] = vectors.map((vector, idx) =>
      this.buildDatapoint(vector, documents[idx])
    );
    const options = {};
    const response = await this.upsertDatapointClient.request(
      datapoints,
      options
    );
    if (Object.keys(response?.data ?? {}).length === 0) {
      // Nothing in the response in the body means we saved it ok
      const idDoc = documents as IdDocument[];
      const docsToStore: Record<string, Document> = {};
      idDoc.forEach((doc) => {
        if (doc.id) {
          docsToStore[doc.id] = doc;
        }
      });
      await this.docstore.add(docsToStore);
    }
  }

  // TODO: Refactor this into a utility type and use with pinecone as well?
  cleanMetadata(documentMetadata: Record<string, any>): {
    [key: string]: string | number | boolean | string[] | null;
  } {
    type metadataType = {
      [key: string]: string | number | boolean | string[] | null;
    };

    function getStringArrays(
      prefix: string,
      m: Record<string, any>
    ): Record<string, string[]> {
      let ret: Record<string, string[]> = {};

      Object.keys(m).forEach((key) => {
        const newPrefix = prefix.length > 0 ? `${prefix}.${key}` : key;
        const val = m[key];
        if (!val) {
          // Ignore it
        } else if (Array.isArray(val)) {
          // Make sure everything in the array is a string
          ret[newPrefix] = val.map((v) => `${v}`);
        } else if (typeof val === "object") {
          const subArrays = getStringArrays(newPrefix, val);
          ret = { ...ret, ...subArrays };
        }
      });

      return ret;
    }

    const stringArrays: Record<string, string[]> = getStringArrays(
      "",
      documentMetadata
    );

    const flatMetadata: metadataType = flatten(documentMetadata);
    Object.keys(flatMetadata).forEach((key) => {
      Object.keys(stringArrays).forEach((arrayKey) => {
        const matchKey = `${arrayKey}.`;
        if (key.startsWith(matchKey)) {
          delete flatMetadata[key];
        }
      });
    });

    const metadata: metadataType = {
      ...flatMetadata,
      ...stringArrays,
    };
    return metadata;
  }

  metadataToRestrictions(documentMetadata: Record<string, any>): Restriction[] {
    const metadata = this.cleanMetadata(documentMetadata);

    const restrictions: Restriction[] = [];
    for (const key of Object.keys(metadata)) {
      // Make sure the value is an array (or that we'll ignore it)
      let valArray;
      const val = metadata[key];
      if (val === null) {
        valArray = null;
      } else if (Array.isArray(val) && val.length > 0) {
        valArray = val;
      } else {
        valArray = [`${val}`];
      }

      // Add to the restrictions if we do have a valid value
      if (valArray) {
        // Determine if this key is for the allowList or denyList
        // TODO: get which ones should be on the deny list
        const listType = "allowList";

        // Create the restriction
        const restriction: Restriction = {
          namespace: key,
          [listType]: valArray,
        };

        // Add it to the restriction list
        restrictions.push(restriction);
      }
    }
    return restrictions;
  }

  /**
   * Create an index datapoint for the vector and document id.
   * If an id does not exist, create it and set the document to its value.
   * @param vector
   * @param document
   */
  buildDatapoint(vector: number[], document: IdDocument): IndexDatapoint {
    if (!document.id) {
      // eslint-disable-next-line no-param-reassign
      document.id = uuid.v4();
    }
    const ret: IndexDatapoint = {
      datapointId: document.id,
      featureVector: vector,
    };
    const restrictions = this.metadataToRestrictions(document.metadata);
    if (restrictions?.length > 0) {
      ret.restricts = restrictions;
    }
    return ret;
  }

  async delete(params: MatchingEngineDeleteParams): Promise<void> {
    const options = {};
    await this.removeDatapointClient.request(params.ids, options);
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: this["FilterType"]
  ): Promise<[Document, number][]> {
    // Format the query into the request
    const deployedIndexId = await this.getDeployedIndexId();
    const requestQuery: FindNeighborsRequestQuery = {
      neighborCount: k,
      datapoint: {
        datapointId: `0`,
        featureVector: query,
      },
    };
    if (filter) {
      requestQuery.datapoint.restricts = filter;
    }
    const request: FindNeighborsRequest = {
      deployedIndexId,
      queries: [requestQuery],
    };

    // Build the connection.
    // Has to be done here, since we defer getting the endpoint until
    // we need it.
    const apiEndpoint = await this.getPublicAPIEndpoint();
    const findNeighborsParams: FindNeighborsConnectionParams = {
      endpoint: apiEndpoint,
      indexEndpoint: this.indexEndpoint,
      apiVersion: this.apiVersion,
      location: this.location,
      deployedIndexId,
    };
    const connection = new FindNeighborsConnection(
      findNeighborsParams,
      this.caller
    );

    // Make the call
    const options = {};
    const response = await connection.request(request, options);

    // Get the document for each datapoint id and return them
    const nearestNeighbors = response?.data?.nearestNeighbors ?? [];
    const nearestNeighbor = nearestNeighbors[0];
    const neighbors = nearestNeighbor?.neighbors ?? [];
    const ret: [Document, number][] = await Promise.all(
      neighbors.map(async (neighbor) => {
        const id = neighbor?.datapoint?.datapointId;
        const distance = neighbor?.distance;
        let doc: IdDocument;
        try {
          doc = await this.docstore.search(id);
        } catch (xx) {
          console.error(xx);
          doc = new Document({ pageContent: `Missing document ${id}` });
        }
        doc.id ??= id;
        return [doc, distance];
      })
    );

    return ret;
  }

  /**
   * For this index endpoint, figure out what API Endpoint URL and deployed
   * index ID should be used to do upserts and queries.
   * Also sets the `apiEndpoint` and `deployedIndexId` property for future use.
   * @return The URL
   */
  async determinePublicAPIEndpoint(): Promise<PublicAPIEndpointInfo> {
    const response: IndexEndpointResponse =
      await this.indexEndpointClient.request(this.callerOptions);

    // Get the endpoint
    const publicEndpointDomainName = response?.data?.publicEndpointDomainName;
    this.apiEndpoint = publicEndpointDomainName;

    // Determine which of the deployed indexes match the index id
    // and get the deployed index id. The list of deployed index ids
    // contain the "index name" or path, but not the index id by itself,
    // so we need to extract it from the name
    const indexPathPattern = /projects\/.+\/locations\/.+\/indexes\/(.+)$/;
    const deployedIndexes = response?.data?.deployedIndexes ?? [];
    let found = false;
    for (let co = 0; co < deployedIndexes.length && !found; co += 1) {
      const deployedIndex = deployedIndexes[co];
      const deployedIndexPath = deployedIndex.index;
      const match = deployedIndexPath.match(indexPathPattern);
      if (match) {
        const [, potentialIndexId] = match;
        if (potentialIndexId === this.index) {
          this.deployedIndexId = deployedIndex.id;
          found = true;
        }
      }
    }

    return {
      apiEndpoint: this.apiEndpoint,
      deployedIndexId: this.deployedIndexId,
    };
  }

  async getPublicAPIEndpoint(): Promise<string> {
    return (
      this.apiEndpoint ?? (await this.determinePublicAPIEndpoint()).apiEndpoint
    );
  }

  async getDeployedIndexId(): Promise<string> {
    return (
      this.deployedIndexId ??
      (await this.determinePublicAPIEndpoint()).deployedIndexId
    );
  }

  static async fromTexts(
    texts: string[],
    metadatas: object[] | object,
    embeddings: Embeddings,
    dbConfig: MatchingEngineArgs
  ): Promise<VectorStore> {
    const docs: Document[] = texts.map(
      (text, index): Document => ({
        pageContent: text,
        metadata: Array.isArray(metadatas) ? metadatas[index] : metadatas,
      })
    );
    return this.fromDocuments(docs, embeddings, dbConfig);
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: Embeddings,
    dbConfig: MatchingEngineArgs
  ): Promise<VectorStore> {
    const ret = new MatchingEngine(embeddings, dbConfig);
    await ret.addDocuments(docs);
    return ret;
  }
}
