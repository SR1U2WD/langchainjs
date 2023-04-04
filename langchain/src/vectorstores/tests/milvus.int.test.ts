import { test, expect, afterAll , beforeAll } from "@jest/globals";

import { Milvus } from '../milvus.js';
import { OpenAIEmbeddings } from "../../embeddings/index.js";
import { ErrorCode } from '@zilliz/milvus2-sdk-node/dist/milvus/types.js';
import { MilvusClient } from '@zilliz/milvus2-sdk-node/dist/milvus/index.js';

let collectionName: string;
let embeddings: OpenAIEmbeddings;

beforeAll(async () => {
    embeddings = new OpenAIEmbeddings();
    collectionName = "test_collection_" + Math.random().toString(36).substring(7);
})

test("Test Milvus.fromtext", async () => {
    const texts = [
        "Tortoise: Labyrinth? Labyrinth? Could it Are we in the notorious Little\
            Harmonic Labyrinth of the dreaded Majotaur?",
        "Achilles: Yiikes! What is that?",
        "Tortoise: They say-although I person never believed it myself-that an I\
            Majotaur has created a tiny labyrinth sits in a pit in the middle of\
            it, waiting innocent victims to get lost in its fears complexity.\
            Then, when they wander and dazed into the center, he laughs and\
            laughs at them-so hard, that he laughs them to death!",
        "Achilles: Oh, no!",
        "Tortoise: But it's only a myth. Courage, Achilles.",
    ]
    const metadatas: object[] = [{ id: 2 }, { id: 1 }, { id: 3 }, { id: 4 }, { id: 5 }]
    const milvus = await Milvus.fromTexts(texts, metadatas, embeddings, {collectionName: collectionName})
    
    const query = "who is achilles?"
    const result = await milvus.similaritySearch(query, 1)
    const resultMetadatas = result.map(({ metadata }) =>  metadata )
    expect(resultMetadatas).toEqual([{ id: 1 }])

    const resultTwo = await milvus.similaritySearch(query, 3)
    const resultTwoMetadatas = resultTwo.map(({ metadata }) => metadata )
    expect(resultTwoMetadatas).toEqual([{ id: 1 }, { id: 4 }, { id: 5 }])
})

test("Test Milvus.fromExistingCollection", async () => {
    const milvus = await Milvus.fromExistingCollection(embeddings, {collectionName: collectionName})

    const query = "who is achilles?"
    const result = await milvus.similaritySearch(query, 1)
    const resultMetadatas = result.map(({ metadata }) =>  metadata )
    expect(resultMetadatas).toEqual([{ id: 1 }])

    const resultTwo = await milvus.similaritySearch(query, 3)
    const resultTwoMetadatas = resultTwo.map(({ metadata }) => metadata )
    expect(resultTwoMetadatas).toEqual([{ id: 1 }, { id: 4 }, { id: 5 }])
})



afterAll(async () => {
    const client = new MilvusClient(process.env.MILVUS_URL as string)
    const dropRes = await client.collectionManager.dropCollection({ collection_name: collectionName })
    // console.log("Drop collection response: ", dropRes)
    expect(dropRes.error_code).toBe(ErrorCode.SUCCESS)
})