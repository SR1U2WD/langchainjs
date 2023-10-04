/* eslint-disable no-process-env */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, test } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { Pinecone } from '@pinecone-database/pinecone'
import * as uuid from "uuid";
import { Document } from "../../document.js";
import { OpenAIEmbeddings } from "../../embeddings/openai.js";
import { PineconeLibArgs, PineconeStore } from "../pinecone.js";

describe("PineconeStore", () => {
  let pineconeStore: PineconeStore;
  const testIndexName = 'langchain-pinecone-test'

  beforeEach(async () => {
    const embeddings = new OpenAIEmbeddings();

    const pinecone = new Pinecone();

    await pinecone.createIndex({
      name: testIndexName,
      dimension: 1536,

      // This option tells the client not to throw if the index already exists.
      // It serves as replacement for createIndexIfNotExists
      suppressConflicts: true,

      // This option tells the client not to resolve the promise until the
      // index is ready. It replaces waitUntilIndexIsReady.
      waitUntilReady: true,
    });

    const pineconeIndex = pinecone.Index(testIndexName);

    const pineconeArgs: PineconeLibArgs = {
      pineconeIndex,
    }

    pineconeStore = new PineconeStore(embeddings, pineconeArgs);
  });

  // This hook is run after all of the tests have completed, and we can use it to clean up our 
  // test index
  afterAll(async () => {
    const pinecone = new Pinecone();
    await pinecone.deleteIndex(testIndexName)
  })

  test("user-provided ids", async () => {
    const documentId = uuid.v4();
    const pageContent = faker.lorem.sentence(5);

    await pineconeStore.addDocuments(
      [{ pageContent, metadata: {} }],
      [documentId]
    );

    const results = await pineconeStore.similaritySearch(pageContent, 1);

    expect(results).toEqual([new Document({ metadata: {}, pageContent })]);

    await pineconeStore.addDocuments(
      [{ pageContent: `${pageContent} upserted`, metadata: {} }],
      [documentId]
    );

    const results2 = await pineconeStore.similaritySearch(pageContent, 1);

    expect(results2).toEqual([
      new Document({ metadata: {}, pageContent: `${pageContent} upserted` }),
    ]);
  });

  test("auto-generated ids", async () => {
    const pageContent = faker.lorem.sentence(5);

    await pineconeStore.addDocuments([
      { pageContent, metadata: { foo: "bar" } },
    ]);

    const results = await pineconeStore.similaritySearch(pageContent, 1);

    expect(results).toEqual([
      new Document({ metadata: { foo: "bar" }, pageContent }),
    ]);
  });

  test("metadata filtering", async () => {
    const pageContent = faker.lorem.sentence(5);
    const id = uuid.v4();

    await pineconeStore.addDocuments([
      { pageContent, metadata: { foo: "bar" } },
      { pageContent, metadata: { foo: id } },
      { pageContent, metadata: { foo: "qux" } },
    ]);

    // If the filter wasn't working, we'd get all 3 documents back
    const results = await pineconeStore.similaritySearch(pageContent, 3, {
      foo: id,
    });

    expect(results).toEqual([
      new Document({ metadata: { foo: id }, pageContent }),
    ]);
  });

  test("delete by id", async () => {
    const pageContent = faker.lorem.sentence(5);
    const id = uuid.v4();

    const ids = await pineconeStore.addDocuments([
      { pageContent, metadata: { foo: id } },
      { pageContent, metadata: { foo: id } },
    ]);

    const results = await pineconeStore.similaritySearch(pageContent, 2, {
      foo: id,
    });

    expect(results.length).toEqual(2);

    await pineconeStore.delete({
      ids: ids.slice(0, 1),
    });

    const results2 = await pineconeStore.similaritySearch(pageContent, 2, {
      foo: id,
    });

    expect(results2.length).toEqual(1);
  });

  test("delete all", async () => {
    const pageContent = faker.lorem.sentence(5);
    const id = uuid.v4();

    await pineconeStore.addDocuments([
      { pageContent, metadata: { foo: id } },
      { pageContent, metadata: { foo: id } },
    ]);

    const results = await pineconeStore.similaritySearch(pageContent, 2, {
      foo: id,
    });

    expect(results.length).toEqual(2);

    await pineconeStore.delete({
      deleteAll: true,
    });

    const results2 = await pineconeStore.similaritySearch(pageContent, 2, {
      foo: id,
    });

    expect(results2.length).toEqual(0);
  });
});
