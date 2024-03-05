/* eslint-disable no-process-env */
import * as hanaClient from "@sap/hana-client";
// import hana = require("@sap/hana-client")
// import { Connection } from "@sap/hana-client";

import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { test, expect } from "@jest/globals";
import { HanaDB, HanaDBArgs } from "../hanavector.js";

// Connection parameters
const connectionParams = {
  host: process.env.HANA_HOST,
  port: process.env.HANA_PORT,
  uid: process.env.HANA_UID,
  pwd: process.env.HANA_PWD,
};

const embeddings = new OpenAIEmbeddings();

beforeAll(async () => {
  expect(process.env.HANA_HOST).toBeDefined();
  expect(process.env.HANA_PORT).toBeDefined();
  expect(process.env.HANA_UID).toBeDefined();
  expect(process.env.HANA_PWD).toBeDefined();
  expect(process.env.OPENAI_API_KEY).toBeDefined();
});

test("test fromText", async () => {
  // Create a new client instance
  // const con = new Connection();
  // const conState = con.state();
  // var conn = hana.createConnection();
  const client = hanaClient.createConnection();
  const args: HanaDBArgs = {
    connection: client,
    tableName: 'test',
    };
    client.connect(connectionParams);
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

  const results = await vectorStore.similaritySearch("hello world", 1);

  expect(results).toHaveLength(1);
  expect(results).toEqual([
    new Document({
      pageContent: "Hello world",
      metadata: { id: 1, name: "1" },
    }),
  ]);

});
