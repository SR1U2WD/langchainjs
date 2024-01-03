/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

module.exports = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  docs: [
    {
      type: "category",
      label: "Get started",
      collapsed: false,
      collapsible: false,
      items: [{ type: "autogenerated", dirName: "get_started" }],
      link: {
        type: "generated-index",
        description: "Get started with LangChain",
        slug: "get_started",
      },
    },
    {
      type: "category",
      label: "LangChain Expression Language",
      collapsed: false,
      items: [{ type: "autogenerated", dirName: "expression_language" }],
      link: {
        type: "doc",
        id: "expression_language/index",
      },
    },
    {
      type: "category",
      label: "Modules",
      collapsed: false,
      collapsible: false,
      items: [
        {
          type: "category",
          label: "Model I/O",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "modules/model_io",
            },
          ],
          link: { type: "doc", id: "modules/model_io/index" },
        },
        {
          type: "category",
          label: "Retrieval",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "modules/data_connection",
            },
          ],
          link: { type: "doc", id: "modules/data_connection/index" },
        },
        {
          type: "category",
          label: "Agents",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "modules/agents",
            },
          ],
          link: { type: "doc", id: "modules/agents/index" },
        },
        {
          type: "category",
          label: "More",
          collapsed: true,
          items: [
            {
              type: "category",
              label: "Chains",
              collapsed: true,
              items: [
                {
                  type: "autogenerated",
                  dirName: "modules/chains",
                },
              ],
              link: { type: "doc", id: "modules/chains/index" },
            },
            {
              type: "category",
              label: "Memory",
              collapsed: true,
              items: [
                {
                  type: "autogenerated",
                  dirName: "modules/memory",
                },
              ],
              link: { type: "doc", id: "modules/memory/index" },
            },
            {
              type: "category",
              label: "Callbacks",
              collapsed: true,
              items: [
                {
                  type: "autogenerated",
                  dirName: "modules/callbacks",
                },
              ],
              link: { type: "doc", id: "modules/callbacks/index" },
            },
            {
              type: "category",
              label: "Experimental",
              collapsed: true,
              items: [
                {
                  type: "autogenerated",
                  dirName: "modules/experimental",
                },
              ],
              link: { type: "doc", id: "modules/experimental/index" },
            },
            {
              type: "category",
              label: "Storage",
              collapsed: true,
              items: [
                {
                  type: "autogenerated",
                  dirName: "modules/storage",
                },
              ],
              link: { type: "doc", id: "modules/storage/index" },
            },
          ],
        },
      ],
      link: {
        type: "doc",
        id: "modules/index",
      },
    },
    {
      type: "doc",
      label: "Security",
      id: "security",
    },
    {
      type: "category",
      label: "Guides",
      collapsed: true,
      items: [{ type: "autogenerated", dirName: "guides" }],
      link: {
        type: "generated-index",
        description: "Design guides for key parts of the development process",
        slug: "guides",
      },
    },
    {
      type: "category",
      label: "Ecosystem",
      collapsed: true,
      items: [
        { type: "autogenerated", dirName: "ecosystem" },
        {
          type: "link",
          label: "LangSmith",
          href: "https://docs.smith.langchain.com",
        },
      ],
      link: {
        type: "generated-index",
        slug: "ecosystem",
      },
    },
    {
      type: "html",
      value: "<hr>",
      defaultStyle: true,
    },
  ],
  use_cases: [
    {
      type: "category",
      label: "Use cases",
      collapsed: true,
      items: [{ type: "autogenerated", dirName: "use_cases" }],
      link: {
        type: "generated-index",
        description: "Walkthroughs of common end-to-end use cases",
        slug: "use_cases",
      },
    },
  ],
  integrations: [
    {
      type: "category",
      label: "Providers",
      collapsed: true,
      items: [{ type: "autogenerated", dirName: "integrations/platforms" }],
      link: {
        type: "generated-index",
        description: "LangChain.js integration providers.",
        slug: "integrations/platforms",
      },
    },
    {
      type: "category",
      label: "Components",
      collapsible: false,
      items: [
        {
          type: "category",
          label: "LLMs",
          collapsed: true,
          items: [{ type: "autogenerated", dirName: "integrations/llms" }],
          link: { type: "doc", id: "integrations/llms/index" },
        },
        {
          type: "category",
          label: "Chat models",
          collapsed: true,
          items: [{ type: "autogenerated", dirName: "integrations/chat" }],
          link: { type: "doc", id: "integrations/chat/index" },
        },
        {
          type: "category",
          label: "Document loaders",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/document_loaders" },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/document_loaders",
          },
        },
        {
          type: "category",
          label: "Document transformers",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/document_transformers",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/document_transformers",
          },
        },
        {
          type: "category",
          label: "Text embedding models",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/text_embedding" },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/text_embedding",
          },
        },
        {
          type: "category",
          label: "Vector stores",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/vectorstores" },
          ],
          link: { type: "generated-index", slug: "integrations/vectorstores" },
        },
        {
          type: "category",
          label: "Retrievers",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/retrievers" },
          ],
          link: { type: "generated-index", slug: "integrations/retrievers" },
        },
        {
          type: "category",
          label: "Tools",
          collapsed: true,
          items: [{ type: "autogenerated", dirName: "integrations/tools" }],
          link: { type: "generated-index", slug: "integrations/tools" },
        },
        {
          type: "category",
          label: "Agents and toolkits",
          collapsed: true,
          items: [{ type: "autogenerated", dirName: "integrations/toolkits" }],
          link: { type: "generated-index", slug: "integrations/toolkits" },
        },
        {
          type: "category",
          label: "Chat Memory",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/chat_memory" },
          ],
          link: { type: "generated-index", slug: "integrations/chat_memory" },
        },
        {
          type: "category",
          label: "Storage",
          collapsed: true,
          items: [
            { type: "autogenerated", dirName: "integrations/storage" },
          ],
          link: { type: "generated-index", slug: "integrations/storage" },
        },
      ],
      link: {
        type: "generated-index",
        description:
          "LangChain.js feature integrations with third party libraries, services and more.",
        slug: "integrations/components",
      },
    },
  ],
};
