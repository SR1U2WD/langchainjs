/* eslint-disable no-process-env */
import hanaClient from "@sap/hana-client";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { setTimeout } from "timers/promises";
import { test, expect } from "@jest/globals";
import { HanaDB, HanaDBArgs} from "../hanavector.js";

// Connection parameters
const connectionParams = {
  host: process.env.HANA_HOST,
  port: process.env.HANA_PORT,
  uid: process.env.HANA_UID,
  pwd: process.env.HANA_PWD,
};

const embeddings = new OpenAIEmbeddings();
const tableName = "test";

const client = hanaClient.createConnection();
client.connect(connectionParams);

beforeAll(async () => {
  expect(process.env.HANA_HOST).toBeDefined();
  expect(process.env.HANA_PORT).toBeDefined();
  expect(process.env.HANA_UID).toBeDefined();
  expect(process.env.HANA_PWD).toBeDefined();
  expect(process.env.OPENAI_API_KEY).toBeDefined();
});


describe.skip("add documents and similarity search tests", () => {
  test("test fromText and default similarity search", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      };
    const vectorStore = await HanaDB.fromTexts(
      ["Bye bye", "Hello world", "hello nice world"],
      [
        { id: 2, name: "2" },
        { id: 1, name: "1" },
        { id: 3, name: "3" },
      ],
      embeddings,
      args
      );
    expect(vectorStore).toBeDefined();
    // sleep 5 seconds to make sure the documents are indexed.
    await setTimeout(5000);
    const results = await vectorStore.similaritySearch("hello world", 1);
    // console.log(results)
    expect(results).toHaveLength(1);
    expect(results).toEqual([
      new Document({
        pageContent: "Hello world",
        metadata: { id: 1, name: "1" },
      }),
    ]);

  });

  test("performs addDocument and user defined similarity search", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      distanceStrategy: 'euclidean'
      };
    const vectorStore = new HanaDB(embeddings, args);
    expect(vectorStore).toBeDefined();
    await vectorStore.addDocuments(
      [
        {
          pageContent: "This book is about politics",
          metadata: {
            source: "doc1",
            attributes: [{ key: "a", value: "1" }],
          },
        },
        {
          pageContent: "Cats sleeps a lot.",
          metadata: {
            source: "doc2",
            attributes: [{ key: "b", value: "1" }],
          },
        },
        {
          pageContent: "Sandwiches taste good.",
          metadata: {
            source: "doc3",
            attributes: [{ key: "c", value: "1" }],
          },
        },
        {
          pageContent: "The house is open",
          metadata: {
            source: "doc4",
            attributes: [
              { key: "d", value: "1" },
              { key: "e", value: "2" },
            ],
          },
        },
      ],
    );

    // sleep 5 seconds to make sure the documents are indexed.
    await setTimeout(5000);
    const results: Document[] = await vectorStore.similaritySearch(
      "sandwich",
      1
    );
    // console.log(results);
    expect(results.length).toEqual(1);
    expect(results).toMatchObject([
      {
        pageContent: "Sandwiches taste good.",
        metadata: {
          source: "doc3",
          attributes: [{ key: "c", value: "1" }],
        },
      },
    ]);

    const retriever = vectorStore.asRetriever({});

    const docs = await retriever.getRelevantDocuments("house");
    expect(docs).toBeDefined();
    expect(docs[0]).toMatchObject({
      pageContent: "The house is open",
      metadata: {
        source: "doc4",
        attributes: [
          { key: "d", value: "1" },
          { key: "e", value: "2" },
        ],
      },
    });
  });
});

describe.skip("MMR search tests", () => {
  test("test delete by filter", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      };
    // client.connect(connectionParams);
    const vectorStore = new HanaDB(embeddings, args);
    expect(vectorStore).toBeDefined();
    const filter = { };
    await vectorStore.delete({filter : filter});
    const sql = `SELECT COUNT(*) AS row_count FROM "${args.tableName?.toUpperCase()}"`; 
    const stm = client.prepare(sql);
    const resultSet = stm.execQuery();
    while (resultSet.next()) {
        const result = resultSet.getValue(0)
        expect(result).toEqual(0);
        }
  });


  test("performs max marginal relevance search", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      };
    const texts = ["foo", "foo", "fox"];
    const vectorStore = await HanaDB.fromTexts(
      texts,
      {},
      embeddings,
      args
    );
    // sleep 5 seconds to make sure the documents are indexed.
    await setTimeout(5000);
    const output = await vectorStore.maxMarginalRelevanceSearch("foo", {
      k: 3,
      fetchK: 20,
      lambda: 0
    });

    expect(output).toHaveLength(3);

    const actual = output.map((doc) => doc.pageContent);
    // console.log(actual);
    const expected = ["foo", "fox", "foo"];
    expect(actual).toEqual(expected);

    const standardRetriever = vectorStore.asRetriever();

    const standardRetrieverOutput =
    await standardRetriever.getRelevantDocuments("foo");
    expect(output).toHaveLength(texts.length);

    const standardRetrieverActual = standardRetrieverOutput.map(
      (doc) => doc.pageContent
    );
    const standardRetrieverExpected = ["foo", "foo", "fox"];
    expect(standardRetrieverActual).toEqual(standardRetrieverExpected);

    const retriever = vectorStore.asRetriever({
      searchType: "mmr",
      searchKwargs: {
        fetchK: 20,
        lambda: 0.1,
      },
    });

    const retrieverOutput = await retriever.getRelevantDocuments("foo");
    expect(output).toHaveLength(texts.length);

    const retrieverActual = retrieverOutput.map((doc) => doc.pageContent);
    const retrieverExpected = ["foo", "fox", "foo"];
    expect(retrieverActual).toEqual(retrieverExpected);

    const similarity = await vectorStore.similaritySearchWithScore("foo", 1);
    expect(similarity.length).toBe(1);
  });
});

describe.skip("Filter tests", () => {
  test("test query documents with specific metadata", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      };
    // client.connect(connectionParams);
    const vectorStore = new HanaDB(embeddings, args);
    expect(vectorStore).toBeDefined();
    const docs: Document[] = [
          {
              pageContent: "foo",
              metadata: { start: 100, end: 150, docName: "foo.txt", quality: "bad" },
          },
          {
              pageContent: "bar",
              metadata: { start: 200, end: 250, docName: "bar.txt", quality: "good" },
          },
      ];
    await vectorStore.addDocuments(docs)
    const filter = {"quality": "bad"};
    const query = "foobar"
    // sleep 5 seconds to make sure the documents are indexed.
    await setTimeout(5000);
    const results = await vectorStore.similaritySearch(query, 1, filter)
    expect(results.length).toEqual(1);
    expect(results).toMatchObject([
      {
        pageContent: "foo",
        metadata: { start: 100, end: 150, docName: "foo.txt", quality: "bad" }
      },
    ]);
  });


  test.skip("test delete documents with specific metadata", async () => {
    const args: HanaDBArgs = {
      connection: client,
      tableName: tableName,
      };
    // client.connect(connectionParams);
    const vectorStore = new HanaDB(embeddings, args);
    expect(vectorStore).toBeDefined();
    const filter = {"quality": "good"};
    await vectorStore.delete({filter : filter});
    const sql = `SELECT COUNT(*) AS row_count FROM "${args.tableName?.toUpperCase()}" WHERE  JSON_VALUE(VEC_META, '$.quality') = 'good'`; 
    const stm = client.prepare(sql);
    const resultSet = stm.execQuery();
    while (resultSet.next()) {
        const result = resultSet.getValue(0)
        expect(result).toEqual(0);
        }
  });
});

describe('Sanity check tests', () => {
  it('should sanitize int with illegal value', () => {
    let successful = true;
    try {
      HanaDB.sanitizeInt("HUGO");
      successful = false; // If no error is thrown, mark test as failed
    } catch (error) {
      // Check if the error is an instance of Error and its message contains the expected text
      if (error instanceof Error && /Value .* must not be smaller than -1/.test(error.message)) {
        // The error is as expected; do nothing, letting 'successful' remain true
      } else {
        // The error is not what was expected; fail the test
        successful = false;
      }
    }
    expect(successful).toBe(true);
  });

  it('should sanitize int with legal values', () => {
    expect(HanaDB.sanitizeInt(42)).toBe(42);
    expect(HanaDB.sanitizeInt("21")).toBe(21);
  });

  it('should sanitize int with negative values', () => {
    expect(HanaDB.sanitizeInt(-1)).toBe(-1);
    expect(HanaDB.sanitizeInt("-1")).toBe(-1);
  });

  it('should sanitize int with illegal negative value', () => {
    let successful = true;
    try {
      HanaDB.sanitizeInt(-2);
      successful = false;
    } catch (error) {
      // Check if the error is an instance of Error and its message contains the expected text
      if (error instanceof Error && /Value .* must not be smaller than -1/.test(error.message)) {
        // The error is as expected; do nothing, letting 'successful' remain true
      } else {
        // The error is not what was expected; fail the test
        successful = false;
      }
    }
    expect(successful).toBe(true);
  });

  it('should parse float array from string', () => {
    const arrayAsString = "[0.1, 0.2, 0.3]";
    expect(HanaDB.parseFloatArrayFromString(arrayAsString)).toEqual([0.1, 0.2, 0.3]);
  });
});
