import * as url from "node:url";
import * as path from "node:path";
import { test, expect } from "@jest/globals";
import { UnknownHandling } from "../fs/directory.js";
import { UnstructuredLoader, UnstructuredDirectoryLoader } from "../fs/unstructured.js";

test.skip("Test Unstructured base loader", async () => {
  const loader = new UnstructuredLoader(
    "http://127.0.0.1:8000/general/v0.0.4/general",
    "langchain/src/document_loaders/tests/example_data/example.txt"
  );
  const docs = await loader.load();

  expect(docs.length).toBe(3);
  for (const doc of docs) {
    expect(typeof doc.pageContent).toBe("string");
  }
});


test("Test Unstructured directory loader", async () => {
	const directoryPath = path.resolve(
		path.dirname(url.fileURLToPath(import.meta.url)),
		"./example_data"
	);

  const loader = new UnstructuredDirectoryLoader(
    "https://api.unstructured.io/general/v0/general",
    directoryPath,
    true,
    UnknownHandling.Ignore,
  );
  const docs = await loader.load();

  expect(docs.length).toBe(619);
  expect(typeof docs[0].pageContent).toBe("string");
});
