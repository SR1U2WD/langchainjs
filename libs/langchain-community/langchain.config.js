import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} relativePath
 * @returns {string}
 */
function abs(relativePath) {
  return resolve(dirname(fileURLToPath(import.meta.url)), relativePath);
}

export const config = {
  internals: [
    /node\:/,
    /@langchain\/core\//,
    /langchain\//,
    "@rockset/client/dist/codegen/api.js",
    "convex",
    "convex/server",
    "convex/values",
    "discord.js",
    "duck-duck-scrape",
    "firebase-admin/app",
    "firebase-admin/firestore",
    "lunary/langchain",
    "mysql2/promise",
    "pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js",
    "web-auth-library/google",
    "notion-to-md/build/utils/notion.js",
    "@getzep/zep-cloud/api"
  ],
  entrypoints: {
    load: "load/index",
    // tools
    "load/serializable": "load/serializable",
    "tools/aiplugin": "tools/aiplugin",
    "tools/aws_lambda": "tools/aws_lambda",
    "tools/aws_sfn": "tools/aws_sfn",
    "tools/bingserpapi": "tools/bingserpapi",
    "tools/brave_search": "tools/brave_search",
    "tools/duckduckgo_search": "tools/duckduckgo_search",
    "tools/calculator": "tools/calculator",
    "tools/connery": "tools/connery",
    "tools/dadjokeapi": "tools/dadjokeapi",
    "tools/discord": "tools/discord",
    "tools/dynamic": "tools/dynamic",
    "tools/dataforseo_api_search": "tools/dataforseo_api_search",
    "tools/gmail": "tools/gmail/index",
    "tools/google_calendar": "tools/google_calendar/index",
    "tools/google_custom_search": "tools/google_custom_search",
    "tools/google_places": "tools/google_places",
    "tools/google_routes": "tools/google_routes",
    "tools/ifttt": "tools/ifttt",
    "tools/searchapi": "tools/searchapi",
    "tools/searxng_search": "tools/searxng_search",
    "tools/serpapi": "tools/serpapi",
    "tools/serper": "tools/serper",
    "tools/stackexchange": "tools/stackexchange",
    "tools/tavily_search": "tools/tavily_search",
    "tools/wikipedia_query_run": "tools/wikipedia_query_run",
    "tools/wolframalpha": "tools/wolframalpha",
    // toolkits
    "agents/toolkits/aws_sfn": "agents/toolkits/aws_sfn",
    "agents/toolkits/base": "agents/toolkits/base",
    "agents/toolkits/connery": "agents/toolkits/connery/index",
    // embeddings
    "embeddings/alibaba_tongyi": "embeddings/alibaba_tongyi",
    "embeddings/baidu_qianfan": "embeddings/baidu_qianfan",
    "embeddings/bedrock": "embeddings/bedrock",
    "embeddings/cloudflare_workersai": "embeddings/cloudflare_workersai",
    "embeddings/cohere": "embeddings/cohere",
    "embeddings/deepinfra": "embeddings/deepinfra",
    "embeddings/fireworks": "embeddings/fireworks",
    "embeddings/googlepalm": "embeddings/googlepalm",
    "embeddings/googlevertexai": "embeddings/googlevertexai",
    "embeddings/gradient_ai": "embeddings/gradient_ai",
    "embeddings/hf": "embeddings/hf",
    "embeddings/hf_transformers": "embeddings/hf_transformers",
    "embeddings/llama_cpp": "embeddings/llama_cpp",
    "embeddings/minimax": "embeddings/minimax",
    "embeddings/ollama": "embeddings/ollama",
    "embeddings/premai": "embeddings/premai",
    "embeddings/tensorflow": "embeddings/tensorflow",
    "embeddings/tencent_hunyuan": "embeddings/tencent_hunyuan/index",
    "embeddings/tencent_hunyuan/web": "embeddings/tencent_hunyuan/web",
    "embeddings/togetherai": "embeddings/togetherai",
    "embeddings/voyage": "embeddings/voyage",
    "embeddings/zhipuai": "embeddings/zhipuai",
    // llms
    "llms/ai21": "llms/ai21",
    "llms/aleph_alpha": "llms/aleph_alpha",
    "llms/bedrock": "llms/bedrock/index",
    "llms/bedrock/web": "llms/bedrock/web",
    "llms/cloudflare_workersai": "llms/cloudflare_workersai",
    "llms/cohere": "llms/cohere",
    "llms/deepinfra": "llms/deepinfra",
    "llms/fireworks": "llms/fireworks",
    "llms/friendli": "llms/friendli",
    "llms/googlepalm": "llms/googlepalm",
    "llms/googlevertexai": "llms/googlevertexai/index",
    "llms/googlevertexai/web": "llms/googlevertexai/web",
    "llms/gradient_ai": "llms/gradient_ai",
    "llms/hf": "llms/hf",
    "llms/llama_cpp": "llms/llama_cpp",
    "llms/ollama": "llms/ollama",
    "llms/portkey": "llms/portkey",
    "llms/raycast": "llms/raycast",
    "llms/replicate": "llms/replicate",
    "llms/sagemaker_endpoint": "llms/sagemaker_endpoint",
    "llms/togetherai": "llms/togetherai",
    "llms/watsonx_ai": "llms/watsonx_ai",
    "llms/writer": "llms/writer",
    "llms/yandex": "llms/yandex",
    "llms/layerup_security": "llms/layerup_security",
    // vectorstores
    "vectorstores/analyticdb": "vectorstores/analyticdb",
    "vectorstores/astradb": "vectorstores/astradb",
    "vectorstores/azure_aisearch": "vectorstores/azure_aisearch",
    "vectorstores/azure_cosmosdb": "vectorstores/azure_cosmosdb",
    "vectorstores/cassandra": "vectorstores/cassandra",
    "vectorstores/chroma": "vectorstores/chroma",
    "vectorstores/clickhouse": "vectorstores/clickhouse",
    "vectorstores/closevector/node": "vectorstores/closevector/node",
    "vectorstores/closevector/web": "vectorstores/closevector/web",
    "vectorstores/cloudflare_vectorize": "vectorstores/cloudflare_vectorize",
    "vectorstores/convex": "vectorstores/convex",
    "vectorstores/couchbase": "vectorstores/couchbase",
    "vectorstores/elasticsearch": "vectorstores/elasticsearch",
    "vectorstores/faiss": "vectorstores/faiss",
    "vectorstores/googlevertexai": "vectorstores/googlevertexai",
    "vectorstores/hnswlib": "vectorstores/hnswlib",
    "vectorstores/hanavector": "vectorstores/hanavector",
    "vectorstores/lancedb": "vectorstores/lancedb",
    "vectorstores/milvus": "vectorstores/milvus",
    "vectorstores/momento_vector_index": "vectorstores/momento_vector_index",
    "vectorstores/mongodb_atlas": "vectorstores/mongodb_atlas",
    "vectorstores/myscale": "vectorstores/myscale",
    "vectorstores/neo4j_vector": "vectorstores/neo4j_vector",
    "vectorstores/neon": "vectorstores/neon",
    "vectorstores/opensearch": "vectorstores/opensearch",
    "vectorstores/pgvector": "vectorstores/pgvector",
    "vectorstores/pinecone": "vectorstores/pinecone",
    "vectorstores/prisma": "vectorstores/prisma",
    "vectorstores/qdrant": "vectorstores/qdrant",
    "vectorstores/redis": "vectorstores/redis",
    "vectorstores/rockset": "vectorstores/rockset",
    "vectorstores/singlestore": "vectorstores/singlestore",
    "vectorstores/supabase": "vectorstores/supabase",
    "vectorstores/tigris": "vectorstores/tigris",
    "vectorstores/turbopuffer": "vectorstores/turbopuffer",
    "vectorstores/typeorm": "vectorstores/typeorm",
    "vectorstores/typesense": "vectorstores/typesense",
    "vectorstores/upstash": "vectorstores/upstash",
    "vectorstores/usearch": "vectorstores/usearch",
    "vectorstores/vectara": "vectorstores/vectara",
    "vectorstores/vercel_postgres": "vectorstores/vercel_postgres",
    "vectorstores/voy": "vectorstores/voy",
    "vectorstores/weaviate": "vectorstores/weaviate",
    "vectorstores/xata": "vectorstores/xata",
    "vectorstores/zep": "vectorstores/zep",
    "vectorstores/zep_cloud": "vectorstores/zep_cloud",
    // chat_models
    "chat_models/alibaba_tongyi": "chat_models/alibaba_tongyi",
    "chat_models/baiduwenxin": "chat_models/baiduwenxin",
    "chat_models/bedrock": "chat_models/bedrock/index",
    "chat_models/bedrock/web": "chat_models/bedrock/web",
    "chat_models/cloudflare_workersai": "chat_models/cloudflare_workersai",
    "chat_models/deepinfra": "chat_models/deepinfra",
    "chat_models/fireworks": "chat_models/fireworks",
    "chat_models/friendli": "chat_models/friendli",
    "chat_models/googlevertexai": "chat_models/googlevertexai/index",
    "chat_models/googlevertexai/web": "chat_models/googlevertexai/web",
    "chat_models/googlepalm": "chat_models/googlepalm",
    "chat_models/iflytek_xinghuo": "chat_models/iflytek_xinghuo/index",
    "chat_models/iflytek_xinghuo/web": "chat_models/iflytek_xinghuo/web",
    "chat_models/llama_cpp": "chat_models/llama_cpp",
    "chat_models/minimax": "chat_models/minimax",
    "chat_models/moonshot": "chat_models/moonshot",
    "chat_models/ollama": "chat_models/ollama",
    "chat_models/portkey": "chat_models/portkey",
    "chat_models/premai": "chat_models/premai",
    "chat_models/tencent_hunyuan": "chat_models/tencent_hunyuan/index",
    "chat_models/tencent_hunyuan/web": "chat_models/tencent_hunyuan/web",
    "chat_models/togetherai": "chat_models/togetherai",
    "chat_models/webllm": "chat_models/webllm",
    "chat_models/yandex": "chat_models/yandex",
    "chat_models/zhipuai": "chat_models/zhipuai",
    // callbacks
    "callbacks/handlers/llmonitor": "callbacks/handlers/llmonitor",
    "callbacks/handlers/lunary": "callbacks/handlers/lunary",
    "callbacks/handlers/upstash_ratelimit": "callbacks/handlers/upstash_ratelimit",
    // retrievers
    "retrievers/amazon_kendra": "retrievers/amazon_kendra",
    "retrievers/amazon_knowledge_base": "retrievers/amazon_knowledge_base",
    "retrievers/chaindesk": "retrievers/chaindesk",
    "retrievers/databerry": "retrievers/databerry",
    "retrievers/dria": "retrievers/dria",
    "retrievers/metal": "retrievers/metal",
    "retrievers/remote": "retrievers/remote/index",
    "retrievers/supabase": "retrievers/supabase",
    "retrievers/tavily_search_api": "retrievers/tavily_search_api",
    "retrievers/vectara_summary": "retrievers/vectara_summary",
    "retrievers/vespa": "retrievers/vespa",
    "retrievers/zep": "retrievers/zep",
    // query translators
    "structured_query/chroma": "structured_query/chroma",
    "structured_query/qdrant": "structured_query/qdrant",
    "structured_query/supabase": "structured_query/supabase",
    "structured_query/vectara": "structured_query/vectara",
    "retrievers/zep_cloud": "retrievers/zep_cloud",
    // cache
    "caches/cloudflare_kv": "caches/cloudflare_kv",
    "caches/ioredis": "caches/ioredis",
    "caches/momento": "caches/momento",
    "caches/upstash_redis": "caches/upstash_redis",
    // graphs
    "graphs/neo4j_graph": "graphs/neo4j_graph",
    "graphs/memgraph_graph": "graphs/memgraph_graph",
    // document transformers
    "document_transformers/html_to_text": "document_transformers/html_to_text",
    "document_transformers/mozilla_readability":
      "document_transformers/mozilla_readability",
    // storage
    "storage/cassandra": "storage/cassandra",
    "storage/convex": "storage/convex",
    "storage/ioredis": "storage/ioredis",
    "storage/upstash_redis": "storage/upstash_redis",
    "storage/vercel_kv": "storage/vercel_kv",
    // stores
    "stores/doc/base": "stores/doc/base",
    "stores/doc/gcs": "stores/doc/gcs",
    "stores/doc/in_memory": "stores/doc/in_memory",
    "stores/message/astradb": "stores/message/astradb",
    "stores/message/cassandra": "stores/message/cassandra",
    "stores/message/cloudflare_d1": "stores/message/cloudflare_d1",
    "stores/message/convex": "stores/message/convex",
    "stores/message/dynamodb": "stores/message/dynamodb",
    "stores/message/firestore": "stores/message/firestore",
    "stores/message/in_memory": "stores/message/in_memory",
    "stores/message/ipfs_datastore": "stores/message/ipfs_datastore",
    "stores/message/ioredis": "stores/message/ioredis",
    "stores/message/momento": "stores/message/momento",
    "stores/message/mongodb": "stores/message/mongodb",
    "stores/message/planetscale": "stores/message/planetscale",
    "stores/message/postgres": "stores/message/postgres",
    "stores/message/redis": "stores/message/redis",
    "stores/message/upstash_redis": "stores/message/upstash_redis",
    "stores/message/xata": "stores/message/xata",
    "stores/message/zep_cloud": "stores/message/zep_cloud",
    // memory
    "memory/chat_memory": "memory/chat_memory",
    "memory/motorhead_memory": "memory/motorhead_memory",
    "memory/zep": "memory/zep",
    "memory/zep_cloud": "memory/zep_cloud",
    // indexes
    "indexes/base": "indexes/base",
    "indexes/postgres": "indexes/postgres",
    "indexes/memory": "indexes/memory",
    "indexes/sqlite": "indexes/sqlite",
    // document_loaders
    "document_loaders/web/apify_dataset": "document_loaders/web/apify_dataset",
    "document_loaders/web/assemblyai": "document_loaders/web/assemblyai",
    "document_loaders/web/azure_blob_storage_container":
      "document_loaders/web/azure_blob_storage_container",
    "document_loaders/web/azure_blob_storage_file":
      "document_loaders/web/azure_blob_storage_file",
    "document_loaders/web/browserbase": "document_loaders/web/browserbase",
    "document_loaders/web/cheerio": "document_loaders/web/cheerio",
    "document_loaders/web/puppeteer": "document_loaders/web/puppeteer",
    "document_loaders/web/playwright": "document_loaders/web/playwright",
    "document_loaders/web/college_confidential":
      "document_loaders/web/college_confidential",
    "document_loaders/web/gitbook": "document_loaders/web/gitbook",
    "document_loaders/web/hn": "document_loaders/web/hn",
    "document_loaders/web/imsdb": "document_loaders/web/imsdb",
    "document_loaders/web/figma": "document_loaders/web/figma",
    "document_loaders/web/firecrawl": "document_loaders/web/firecrawl",
    "document_loaders/web/github": "document_loaders/web/github",
    "document_loaders/web/notionapi": "document_loaders/web/notionapi",
    "document_loaders/web/pdf": "document_loaders/web/pdf",
    "document_loaders/web/recursive_url": "document_loaders/web/recursive_url",
    "document_loaders/web/s3": "document_loaders/web/s3",
    "document_loaders/web/sitemap": "document_loaders/web/sitemap",
    "document_loaders/web/sonix_audio": "document_loaders/web/sonix_audio",
    "document_loaders/web/confluence": "document_loaders/web/confluence",
    "document_loaders/web/couchbase": "document_loaders/web/couchbase",
    "document_loaders/web/searchapi": "document_loaders/web/searchapi",
    "document_loaders/web/serpapi": "document_loaders/web/serpapi",
    "document_loaders/web/sort_xyz_blockchain":
      "document_loaders/web/sort_xyz_blockchain",
    "document_loaders/web/spider": "document_loaders/web/spider",
    "document_loaders/web/youtube": "document_loaders/web/youtube",
    "document_loaders/fs/chatgpt": "document_loaders/fs/chatgpt",
    "document_loaders/fs/srt": "document_loaders/fs/srt",
    "document_loaders/fs/pdf": "document_loaders/fs/pdf",
    "document_loaders/fs/docx": "document_loaders/fs/docx",
    "document_loaders/fs/epub": "document_loaders/fs/epub",
    "document_loaders/fs/csv": "document_loaders/fs/csv",
    "document_loaders/fs/notion": "document_loaders/fs/notion",
    "document_loaders/fs/obsidian": "document_loaders/fs/obsidian",
    "document_loaders/fs/unstructured": "document_loaders/fs/unstructured",
    "document_loaders/fs/openai_whisper_audio":
      "document_loaders/fs/openai_whisper_audio",
    "document_loaders/fs/pptx": "document_loaders/fs/pptx",
    // utils
    "utils/convex": "utils/convex",
    "utils/event_source_parse": "utils/event_source_parse",
    "utils/cassandra": "utils/cassandra",
    // experimental
    "experimental/graph_transformers/llm":
      "experimental/graph_transformers/llm",
    "experimental/multimodal_embeddings/googlevertexai":
      "experimental/multimodal_embeddings/googlevertexai",
    "experimental/hubs/makersuite/googlemakersuitehub":
      "experimental/hubs/makersuite/googlemakersuitehub",
    "experimental/chat_models/ollama_functions": "experimental/chat_models/ollama_functions",
    // chains
    "chains/graph_qa/cypher": "chains/graph_qa/cypher"
  },
  requiresOptionalDependency: [
    "tools/aws_sfn",
    "tools/aws_lambda",
    "tools/duckduckgo_search",
    "tools/discord",
    "tools/gmail",
    "tools/google_calendar",
    "agents/toolkits/aws_sfn",
    "callbacks/handlers/llmonitor",
    "callbacks/handlers/lunary",
    "callbacks/handlers/upstash_ratelimit",
    "embeddings/bedrock",
    "embeddings/cloudflare_workersai",
    "embeddings/cohere",
    "embeddings/googlevertexai",
    "embeddings/googlepalm",
    "embeddings/tensorflow",
    "embeddings/hf",
    "embeddings/hf_transformers",
    "embeddings/llama_cpp",
    "embeddings/gradient_ai",
    "embeddings/premai",
    "embeddings/tencent_hunyuan",
    "embeddings/tencent_hunyuan/web",
    "embeddings/zhipuai",
    "llms/load",
    "llms/cohere",
    "llms/googlevertexai",
    "llms/googlevertexai/web",
    "llms/googlepalm",
    "llms/gradient_ai",
    "llms/hf",
    "llms/raycast",
    "llms/replicate",
    "llms/sagemaker_endpoint",
    "llms/watsonx_ai",
    "llms/bedrock",
    "llms/bedrock/web",
    "llms/llama_cpp",
    "llms/writer",
    "llms/portkey",
    "llms/layerup_security",
    "vectorstores/analyticdb",
    "vectorstores/astradb",
    "vectorstores/azure_aisearch",
    "vectorstores/azure_cosmosdb",
    "vectorstores/cassandra",
    "vectorstores/chroma",
    "vectorstores/clickhouse",
    "vectorstores/closevector/node",
    "vectorstores/closevector/web",
    "vectorstores/cloudflare_vectorize",
    "vectorstores/convex",
    "vectorstores/couchbase",
    "vectorstores/elasticsearch",
    "vectorstores/faiss",
    "vectorstores/googlevertexai",
    "vectorstores/hnswlib",
    "vectorstores/hanavector",
    "vectorstores/lancedb",
    "vectorstores/milvus",
    "vectorstores/momento_vector_index",
    "vectorstores/mongodb_atlas",
    "vectorstores/myscale",
    "vectorstores/neo4j_vector",
    "vectorstores/neon",
    "vectorstores/opensearch",
    "vectorstores/pgvector",
    "vectorstores/pinecone",
    "vectorstores/qdrant",
    "vectorstores/redis",
    "vectorstores/rockset",
    "vectorstores/singlestore",
    "vectorstores/supabase",
    "vectorstores/tigris",
    "vectorstores/typeorm",
    "vectorstores/typesense",
    "vectorstores/upstash",
    "vectorstores/usearch",
    "vectorstores/vercel_postgres",
    "vectorstores/voy",
    "vectorstores/weaviate",
    "vectorstores/xata",
    "vectorstores/zep",
    "vectorstores/zep_cloud",
    "chat_models/bedrock",
    "chat_models/bedrock/web",
    "chat_models/googlevertexai",
    "chat_models/googlevertexai/web",
    "chat_models/googlepalm",
    "chat_models/llama_cpp",
    "chat_models/portkey",
    "chat_models/premai",
    "chat_models/tencent_hunyuan",
    "chat_models/tencent_hunyuan/web",
    "chat_models/iflytek_xinghuo",
    "chat_models/iflytek_xinghuo/web",
    "chat_models/webllm",
    "chat_models/zhipuai",
    "retrievers/amazon_kendra",
    "retrievers/amazon_knowledge_base",
    "retrievers/dria",
    "retrievers/metal",
    "retrievers/supabase",
    "retrievers/vectara_summary",
    "retrievers/zep",
    // query translators
    "structured_query/chroma",
    "structured_query/qdrant",
    "structured_query/supabase",
    "structured_query/vectara",
    "retrievers/zep_cloud",
    "cache/cloudflare_kv",
    "cache/momento",
    "cache/upstash_redis",
    "graphs/neo4j_graph",
    "graphs/memgraph_graph",
    // document_transformers
    "document_transformers/html_to_text",
    "document_transformers/mozilla_readability",
    // storage
    "storage/cassandra",
    "storage/convex",
    "storage/ioredis",
    "storage/upstash_redis",
    "storage/vercel_kv",
    // stores
    "stores/message/astradb",
    "stores/message/cassandra",
    "stores/message/cloudflare_d1",
    "stores/message/convex",
    "stores/message/dynamodb",
    "stores/message/firestore",
    "stores/message/ioredis",
    "stores/message/ipfs_datastore",
    "stores/message/momento",
    "stores/message/mongodb",
    "stores/message/planetscale",
    "stores/message/postgres",
    "stores/message/redis",
    "stores/message/upstash_redis",
    "stores/message/xata",
    "stores/message/zep_cloud",
    // memory
    "memory/motorhead_memory",
    "memory/zep",
    "memory/zep_cloud",
    // utils
    "utils/convex",
    "utils/cassandra",
    // indexes
    "indexes/postgres",
    "indexes/sqlite",
    // document loaders
    "document_loaders/web/apify_dataset",
    "document_loaders/web/assemblyai",
    "document_loaders/web/azure_blob_storage_container",
    "document_loaders/web/azure_blob_storage_file",
    "document_loaders/web/browserbase",
    "document_loaders/web/cheerio",
    "document_loaders/web/puppeteer",
    "document_loaders/web/playwright",
    "document_loaders/web/college_confidential",
    "document_loaders/web/gitbook",
    "document_loaders/web/hn",
    "document_loaders/web/imsdb",
    "document_loaders/web/figma",
    "document_loaders/web/firecrawl",
    "document_loaders/web/github",
    "document_loaders/web/pdf",
    "document_loaders/web/notionapi",
    "document_loaders/web/recursive_url",
    "document_loaders/web/s3",
    "document_loaders/web/sitemap",
    "document_loaders/web/sonix_audio",
    "document_loaders/web/spider",
    "document_loaders/web/confluence",
    "document_loaders/web/couchbase",
    "document_loaders/web/youtube",
    "document_loaders/fs/chatgpt",
    "document_loaders/fs/srt",
    "document_loaders/fs/pdf",
    "document_loaders/fs/docx",
    "document_loaders/fs/epub",
    "document_loaders/fs/csv",
    "document_loaders/fs/notion",
    "document_loaders/fs/obsidian",
    "document_loaders/fs/unstructured",
    "document_loaders/fs/openai_whisper_audio",
    "document_loaders/fs/pptx",
    // experimental
    "experimental/multimodal_embeddings/googlevertexai",
    "experimental/hubs/makersuite/googlemakersuitehub",
    // chains
    "chains/graph_qa/cypher"
  ],
  packageSuffix: "community",
  tsConfigPath: resolve("./tsconfig.json"),
  cjsSource: "./dist-cjs",
  cjsDestination: "./dist",
  abs,
};
