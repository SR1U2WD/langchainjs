import { Document, DocumentInterface } from "@langchain/core/documents";
import { chunkArray } from "@langchain/core/utils/chunk_array";
import { CheerioWebBaseLoader, WebBaseLoaderParams } from "./cheerio.js";

/**
 * Interface representing the parameters for initializing a SitemapLoader.
 * @interface SitemapLoaderParams
 * @extends WebBaseLoaderParams
 */
export interface SitemapLoaderParams extends WebBaseLoaderParams {
  /**
   * @property {string[] | undefined} filterUrls - A list of regexes. Only URLs that match one of the filter URLs will be loaded.
   * WARNING: The filter URLs are interpreted as regular expressions. Escape special characters if needed.
   */
  filterUrls?: string[];
  /**
   * The size to chunk the sitemap URLs into for scraping.
   * @default {300}
   */
  chunkSize?: number;
}

type SiteMapElement = {
  loc: string;
  changefreq?: string;
  lastmod?: string;
  priority?: string;
};

export class SitemapLoader
  extends CheerioWebBaseLoader
  implements SitemapLoaderParams
{
  allowUrlPatterns: string[] | undefined;

  chunkSize: number;

  constructor(public webPath: string, params: SitemapLoaderParams = {}) {
    const paramsWithDefaults = { chunkSize: 300, ...params };
    let path = webPath.endsWith("/") ? webPath.slice(0, -1) : webPath;
    // Allow for custom sitepath paths to be passed in.
    path = path.endsWith(".xml") ? path : `${path}/sitemap.xml`;
    super(path, paramsWithDefaults);

    this.webPath = path;
    this.allowUrlPatterns = paramsWithDefaults.filterUrls;
    this.chunkSize = paramsWithDefaults.chunkSize;
  }

  _checkUrlPatterns(url: string): boolean {
    if (!this.allowUrlPatterns) {
      return true;
    }
    return this.allowUrlPatterns.some((pattern) =>
      new RegExp(pattern).test(url)
    );
  }

  async parseSitemap() {
    const $ = await CheerioWebBaseLoader._scrape(
      this.webPath,
      this.caller,
      this.timeout,
      this.textDecoder,
      {
        xmlMode: true,
        xml: true,
      }
    );

    const elements: Array<SiteMapElement> = [];

    $("url").each((_, element) => {
      const loc = $(element).find("loc").text();
      if (!loc) {
        return;
      }

      if (!this._checkUrlPatterns(loc)) {
        return;
      }

      const changefreq = $(element).find("changefreq").text();
      const lastmod = $(element).find("lastmod").text();
      const priority = $(element).find("priority").text();

      elements.push({ loc, changefreq, lastmod, priority });
    });

    $("sitemap").each((_, element) => {
      const loc = $(element).find("loc").text();
      if (!loc) {
        return;
      }
      const changefreq = $(element).find("changefreq").text();
      const lastmod = $(element).find("lastmod").text();
      const priority = $(element).find("priority").text();

      elements.push({ loc, changefreq, lastmod, priority });
    });

    return elements;
  }

  async _loadSitemapUrls(
    elements: Array<SiteMapElement>
  ): Promise<DocumentInterface[]> {
    const all = await CheerioWebBaseLoader.scrapeAll(
      elements.map((ele) => ele.loc),
      this.caller,
      this.timeout,
      this.textDecoder
    );
    const documents: Array<DocumentInterface> = all.map(($, i) => {
      if (!elements[i]) {
        throw new Error("Scraped docs and elements not in sync");
      }
      const text = $(this.selector).text();
      const { loc: source, ...metadata } = elements[i];

      // extract page metadata
      const description = $("meta[name='description']").attr("content");
      const title = $("meta[property='og:title']").attr("content");
      const lang = $("meta[property='og:locale']").attr("content");

      return new Document({
        pageContent: text,
        metadata: {
          ...metadata,
          description,
          title,
          lang,
          source: source.trim(),
        },
      });
    });
    return documents;
  }

  async load(): Promise<Document[]> {
    const elements = await this.parseSitemap();
    const chunks = chunkArray(elements, this.chunkSize);

    const documents: DocumentInterface[] = [];
    for await (const chunk of chunks) {
      const chunkedDocuments = await this._loadSitemapUrls(chunk);
      documents.push(...chunkedDocuments);
    }
    return documents;
  }
}
