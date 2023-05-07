import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonSchema7Type } from "zod-to-json-schema/src/parseDef.js";
import { JsonSchema7ArrayType } from "zod-to-json-schema/src/parsers/array.js";
import { JsonSchema7ObjectType } from "zod-to-json-schema/src/parsers/object.js";
import { JsonSchema7StringType } from "zod-to-json-schema/src/parsers/string.js";
import { JsonSchema7NumberType } from "zod-to-json-schema/src/parsers/number.js";
import {
  BaseOutputParser,
  OutputParserException,
} from "../schema/output_parser.js";

export class StructuredOutputParser<
  T extends z.ZodTypeAny
> extends BaseOutputParser<z.infer<T>> {
  constructor(public schema: T) {
    super();
  }

  static fromZodSchema<T extends z.ZodTypeAny>(schema: T) {
    return new this(schema);
  }

  static fromNamesAndDescriptions<S extends { [key: string]: string }>(
    schemas: S
  ) {
    const zodSchema = z.object(
      Object.fromEntries(
        Object.entries(schemas).map(
          ([name, description]) =>
            [name, z.string().describe(description)] as const
        )
      )
    );

    return new this(zodSchema);
  }

  getFormatInstructions(): string {
    return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match exactly!

Here is the JSON Schema instance your output must adhere to:
\`\`\`json
${JSON.stringify(zodToJsonSchema(this.schema))}
\`\`\`
`;
  }

  getMarkdownJsonInstructionFromSchema(interpolationDepth = 1) {
    if (interpolationDepth < 1) {
      throw new Error("f string interpolation depth must be at least 1");
    }

    return `Return a markdown code snippet with a JSON object formatted to look like:\n\`\`\`json\n${this._schemaToInstruction(
      zodToJsonSchema(this.schema)
    )
      .replaceAll("{", "{".repeat(interpolationDepth))
      .replaceAll("}", "}".repeat(interpolationDepth))}\n\`\`\``;
  }

  private _schemaToInstruction(
    schemaInput: JsonSchema7Type,
    indent = 2
  ): string {
    const schema = schemaInput as (
      | JsonSchema7ArrayType
      | JsonSchema7ObjectType
      | JsonSchema7StringType
      | JsonSchema7NumberType
    ) & { description?: string };

    if (schema.type === "object" && schema.properties) {
      const description = schema.description ? ` // ${schema.description}` : "";
      const properties = Object.entries(schema.properties)
        .map(([key, value]) => {
          const optional = schema.required?.includes(key) ? "" : " (optional)";
          return `${" ".repeat(indent)}"${key}": ${this._schemaToInstruction(
            value,
            indent + 2
          )}${optional}`;
        })
        .join("\n");
      return `{\n${properties}\n${" ".repeat(indent - 2)}}${description}`;
    }
    if (schema.type === "array" && schema.items) {
      const description = schema.description ? ` // ${schema.description}` : "";
      return `array[\n${" ".repeat(indent)}${this._schemaToInstruction(
        schema.items
      )}\n${" ".repeat(indent - 2)}] ${description}`;
    }
    const description = schema.description ? ` // ${schema.description}` : "";
    return `${schema.type}${description}`;
  }

  async parse(text: string): Promise<z.infer<T>> {
    try {
      const json = text.includes("```")
        ? text.trim().split(/```(?:json)?/)[1]
        : text.trim();
      return this.schema.parseAsync(JSON.parse(json));
    } catch (e) {
      throw new OutputParserException(
        `Failed to parse. Text: "${text}". Error: ${e}`,
        text
      );
    }
  }
}
