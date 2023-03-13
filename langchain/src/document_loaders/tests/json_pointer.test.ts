import url from "node:url";
import path from "node:path";
import { test, expect } from "@jest/globals";
import { Document } from "../../document.js";
import { JSONPointerLoader } from "../json_pointer.js";

test("Test JSON loader from file", async () => {
  const filePath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "./example_data/Star_Wars_The_Clone_Wars_S06E07_Crisis_at_the_Heart.json"
  );
  const loader = new JSONPointerLoader(filePath);
  const docs = await loader.load();
  expect(docs.length).toBe(32);
  expect(docs[0]).toEqual(
    new Document({
      metadata: { source: filePath, line: 1 },
      pageContent:
        "<i>Corruption discovered at the core of the Banking Clan!</i>",
    })
  );
});

test("Test JSON Pointer loader for complex json with one pointer that points nothing", async () => {
  const filePath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "./example_data/complex.json"
  );
  const loader = new JSONPointerLoader(filePath, "/body");
  const docs = await loader.load();

  expect(docs.length).toBe(0);
});

test("Test JSON Pointer loader for complex json with one pointer that points a specific object", async () => {
  const filePath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "./example_data/complex.json"
  );
  const loader = new JSONPointerLoader(filePath, "/2/from");
  const docs = await loader.load();

  expect(docs.length).toBe(1);
  expect(docs[0]).toEqual(
    new Document({
      metadata: { source: filePath },
      pageContent: "LinkedIn Job2",
    })
  );
});

test("Test JSON Pointer loader for complex json without pointer", async () => {
  const filePath = path.resolve(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "./example_data/complex.json"
  );
  const loader = new JSONPointerLoader(filePath);
  const docs = await loader.load();

  expect(docs.length).toBe(10);
  expect(docs[0]).toEqual(
    new Document({
      metadata: { source: filePath },
      pageContent: "BD 2023 SUMMER",
    })
  );
  expect(docs[1]).toEqual(
    new Document({
      metadata: { source: filePath },
      pageContent: "LinkedIn Job",
    })
  );
  expect(docs[2]).toEqual(
    new Document({
      metadata: { source: filePath },
      pageContent: "IMPORTANT",
    })
  );
});
