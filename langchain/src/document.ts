export interface DocumentInput<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Metadata extends Record<string, any> = Record<string, any>
> {
  pageContent: string;

  metadata?: Metadata;
}

/**
 * Class for creating and interacting with a document.
 */

export class Document<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Metadata extends Record<string, any> = Record<string, any>
> implements DocumentInput
{
  pageContent: string;

  metadata: Metadata;

  /**
   * Creates a new Document instance.
   *
   * {DocumentInput<Metadata>} fields - Takes `pageContent` as a string
   * and optional `metadata` as Metadata.
   */
  constructor(fields: DocumentInput<Metadata>) {
    this.pageContent = fields.pageContent?.toString() ?? "";
    this.metadata = fields.metadata ?? ({} as Metadata);
  }
}
