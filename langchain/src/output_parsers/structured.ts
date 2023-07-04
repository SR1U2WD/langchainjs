import { Validator } from "@cfworker/json-schema";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonSchema7Type } from "zod-to-json-schema/src/parseDef.js";
import { JsonSchema7ArrayType } from "zod-to-json-schema/src/parsers/array.js";
import { JsonSchema7ObjectType } from "zod-to-json-schema/src/parsers/object.js";
import { JsonSchema7StringType } from "zod-to-json-schema/src/parsers/string.js";
import { JsonSchema7NumberType } from "zod-to-json-schema/src/parsers/number.js";
import { JsonSchema7NullableType } from "zod-to-json-schema/src/parsers/nullable.js";
import {
  BaseOutputParser,
  FormatInstructionsOptions,
  OutputParserException,
} from "../schema/output_parser.js";
import { SerializedFields } from "../load/map_keys.js";
import { JSON_SCHEMA_7_META_JSON_SCHEMA } from "../util/json_schema.js";

export type StructuredOutputParserInput<T extends z.ZodTypeAny = z.ZodTypeAny> =
  {
    jsonSchema?: JsonSchema7Type;
    zodSchema?: T;
  };

export type JsonMarkdownStructuredOutputParserInput = {
  interpolationDepth?: number;
};

export interface JsonMarkdownFormatInstructionsOptions
  extends FormatInstructionsOptions {
  interpolationDepth?: number;
}

export class StructuredOutputParser<
  T extends z.ZodTypeAny = z.ZodTypeAny
> extends BaseOutputParser<z.infer<T>> {
  public jsonSchema: JsonSchema7Type;

  protected jsonSchemaValidator: Validator;

  lc_namespace = ["langchain", "output_parsers", "structured"];

  lc_serializable = true;

  get lc_attributes(): SerializedFields | undefined {
    return {
      jsonSchema: this.jsonSchema,
    };
  }

  constructor({ jsonSchema, zodSchema }: StructuredOutputParserInput<T>) {
    super();
    if (zodSchema !== undefined) {
      this.jsonSchema = zodToJsonSchema(zodSchema);
    } else if (jsonSchema !== undefined) {
      this.jsonSchema = jsonSchema;
    } else {
      throw new Error(`You must provide either a Zod schema or a JSON Schema.`);
    }
    // Will throw if input JSON Schema is not valid
    const result = new Validator(
      JSON_SCHEMA_7_META_JSON_SCHEMA as JsonSchema7Type,
      "7"
    ).validate(this.jsonSchema);
    if (!result.valid) {
      throw new Error(
        `Invalid JSON Schema input: ${JSON.stringify(result.errors)}`
      );
    }
    this.jsonSchemaValidator = new Validator(this.jsonSchema, "7");
  }

  static fromZodSchema<T extends z.ZodTypeAny>(schema: T) {
    return new this({ zodSchema: schema });
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

    return new this({ zodSchema });
  }

  getFormatInstructions(): string {
    return `You must format your output as a JSON value that adheres to a given "JSON Schema" instance.

"JSON Schema" is a declarative language that allows you to annotate and validate JSON documents.

For example, the example "JSON Schema" instance {{"properties": {{"foo": {{"description": "a list of test words", "type": "array", "items": {{"type": "string"}}}}}}, "required": ["foo"]}}}}
would match an object with one required property, "foo". The "type" property specifies "foo" must be an "array", and the "description" property semantically describes it as "a list of test words". The items within "foo" must be strings.
Thus, the object {{"foo": ["bar", "baz"]}} is a well-formatted instance of this example "JSON Schema". The object {{"properties": {{"foo": ["bar", "baz"]}}}} is not well-formatted.

Your output will be parsed and type-checked according to the provided schema instance, so make sure all fields in your output match the schema exactly and there are no trailing commas!

Here is the JSON Schema instance your output must adhere to. Include the enclosing markdown codeblock:
\`\`\`json
${JSON.stringify(this.jsonSchema)}
\`\`\`
`;
  }

  async parse(text: string): Promise<z.infer<T>> {
    try {
      const json = text.includes("```")
        ? text.trim().split(/```(?:json)?/)[1]
        : text.trim();
      const parsedJson = JSON.parse(json);
      const result = this.jsonSchemaValidator.validate(parsedJson);
      if (result.valid) {
        return parsedJson;
      } else {
        throw new Error(JSON.stringify(result.errors));
      }
    } catch (e) {
      throw new OutputParserException(
        `Failed to parse. Text: "${text}". Error: ${e}`,
        text
      );
    }
  }
}

export class JsonMarkdownStructuredOutputParser<
  T extends z.ZodTypeAny
> extends StructuredOutputParser<T> {
  getFormatInstructions(
    options?: JsonMarkdownFormatInstructionsOptions
  ): string {
    const interpolationDepth = options?.interpolationDepth ?? 1;
    if (interpolationDepth < 1) {
      throw new Error("f string interpolation depth must be at least 1");
    }

    return `Return a markdown code snippet with a JSON object formatted to look like:\n\`\`\`json\n${this._schemaToInstruction(
      this.jsonSchema
    )
      .replaceAll("{", "{".repeat(interpolationDepth))
      .replaceAll("}", "}".repeat(interpolationDepth))}\n\`\`\``;
  }

  private _schemaToInstruction(
    schemaInput: JsonSchema7Type,
    indent = 2
  ): string {
    const schema = schemaInput as Extract<
      JsonSchema7Type,
      | JsonSchema7ObjectType
      | JsonSchema7ArrayType
      | JsonSchema7StringType
      | JsonSchema7NumberType
      | JsonSchema7NullableType
    >;

    if ("type" in schema) {
      let nullable = false;
      let type: string;
      if (Array.isArray(schema.type)) {
        const nullIdx = schema.type.findIndex((type) => type === "null");
        if (nullIdx !== -1) {
          nullable = true;
          schema.type.splice(nullIdx, 1);
        }
        type = schema.type.join(" | ") as string;
      } else {
        type = schema.type;
      }

      if (schema.type === "object" && schema.properties) {
        const description = schema.description
          ? ` // ${schema.description}`
          : "";
        const properties = Object.entries(schema.properties)
          .map(([key, value]) => {
            const isOptional = schema.required?.includes(key)
              ? ""
              : " (optional)";
            return `${" ".repeat(indent)}"${key}": ${this._schemaToInstruction(
              value,
              indent + 2
            )}${isOptional}`;
          })
          .join("\n");
        return `{\n${properties}\n${" ".repeat(indent - 2)}}${description}`;
      }
      if (schema.type === "array" && schema.items) {
        const description = schema.description
          ? ` // ${schema.description}`
          : "";
        return `array[\n${" ".repeat(indent)}${this._schemaToInstruction(
          schema.items,
          indent + 2
        )}\n${" ".repeat(indent - 2)}] ${description}`;
      }
      const isNullable = nullable ? " (nullable)" : "";
      const description = schema.description ? ` // ${schema.description}` : "";
      return `${type}${description}${isNullable}`;
    }

    if ("anyOf" in schema) {
      return schema.anyOf
        .map((s) => this._schemaToInstruction(s, indent))
        .join(`\n${" ".repeat(indent - 2)}`);
    }

    throw new Error("unsupported schema type");
  }

  static fromZodSchema<T extends z.ZodTypeAny>(schema: T) {
    return new this<T>({ zodSchema: schema });
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

    return new this<typeof zodSchema>({ zodSchema });
  }
}

export interface AsymmetricStructuredOutputParserFields<
  T extends z.ZodTypeAny
> {
  jsonSchema?: JsonSchema7Type;
  inputSchema?: T;
  zodSchema?: T;
}

export abstract class AsymmetricStructuredOutputParser<
  T extends z.ZodTypeAny,
  Y = unknown
> extends BaseOutputParser<Y> {
  private structuredInputParser: JsonMarkdownStructuredOutputParser<T>;

  constructor({
    jsonSchema,
    zodSchema,
    inputSchema,
  }: AsymmetricStructuredOutputParserFields<T>) {
    super(...arguments);
    this.structuredInputParser = new JsonMarkdownStructuredOutputParser({
      jsonSchema,
      zodSchema: zodSchema ?? inputSchema,
    });
  }

  abstract outputProcessor(input: z.infer<T>): Promise<Y>;

  async parse(text: string): Promise<Y> {
    let parsedInput;
    try {
      parsedInput = await this.structuredInputParser.parse(text);
    } catch (e) {
      throw new OutputParserException(
        `Failed to parse. Text: "${text}". Error: ${e}`,
        text
      );
    }

    return this.outputProcessor(parsedInput);
  }

  getFormatInstructions(): string {
    return this.structuredInputParser.getFormatInstructions();
  }
}
