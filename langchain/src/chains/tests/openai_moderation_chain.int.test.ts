import { test } from "@jest/globals";
import { OpenAIModerationChain } from "../moderation.js";

test("OpenAI Moderation Test", async () => {
  const badString = "Fucking kill yourself!";
  const goodString =
    "The cat (Felis catus) is a domestic species of small carnivorous mammal.";

  const moderation = new OpenAIModerationChain();
  const { output: badResult } = await moderation.call({
    input: badString,
  });

  const { output: goodResult } = await moderation.call({
    input: goodString,
  });

  expect(badResult).toEqual(
    "Text was found that violates OpenAI's content policy."
  );
  expect(goodResult).toEqual(
    "The cat (Felis catus) is a domestic species of small carnivorous mammal."
  );
});
