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
  docs: [
    "introduction",
    {
      type: "category",
      link: { type: "doc", id: "tutorials/index" },
      label: "Tutorials",
      collapsible: false,
      items: [
        {
          type: "autogenerated",
          dirName: "tutorials",
          className: "hidden",
        },
      ],
    },
    {
      type: "category",
      link: { type: "doc", id: "how_to/index" },
      label: "How-to guides",
      collapsible: false,
      items: [
        {
          type: "autogenerated",
          dirName: "how_to",
          className: "hidden",
        },
      ],
    },
    "concepts",
    {
      type: "category",
      label: "Ecosystem",
      collapsed: false,
      collapsible: false,
      items: ["langsmith", "langgraph"],
    },
    {
      type: "category",
      label: "Versions",
      collapsed: false,
      collapsible: false,
      items: [
        {
          type: "autogenerated",
          dirName: "versions",
        },
      ],
    },
    "security",
  ],
  integrations: [
    {
      type: "category",
      label: "Providers",
      collapsible: false,
      items: [
        {
          type: "autogenerated",
          dirName: "integrations/platforms",
        },
        {
          type: "category",
          label: "More",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/providers",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/providers",
          },
        },
      ],
      link: {
        type: "doc",
        id: "integrations/platforms/index",
      },
    },
    {
      type: "category",
      label: "Components",
      collapsible: false,
      items: [
        {
          type: "category",
          label: "Chat models",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/chat",
            },
          ],
          link: {
            type: "doc",
            id: "integrations/chat/index",
          },
        },
        {
          type: "category",
          label: "LLMs",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/llms",
            },
          ],
          link: {
            type: "doc",
            id: "integrations/llms/index",
          },
        },
        {
          type: "category",
          label: "Embedding models",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/text_embedding",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/text_embedding",
          },
        },
        {
          type: "category",
          label: "Document loaders",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/document_loaders",
            },
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
          label: "Vector stores",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/vectorstores",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/vectorstores",
          },
        },
        {
          type: "category",
          label: "Retrievers",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/retrievers",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/retrievers",
          },
        },
        {
          type: "category",
          label: "Tools",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/tools",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/tools",
          },
        },
        {
          type: "category",
          label: "Toolkits",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/toolkits",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/toolkits",
          },
        },
        {
          type: "category",
          label: "Memory",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/memory",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/memory",
          },
        },
        {
          type: "category",
          label: "Graphs",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/graphs",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/graphs",
          },
        },
        {
          type: "category",
          label: "Callbacks",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/callbacks",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/callbacks",
          },
        },
        {
          type: "category",
          label: "Chat loaders",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/chat_loaders",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/chat_loaders",
          },
        },
        {
          type: "category",
          label: "Adapters",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/adapters",
            },
          ],
          link: {
            type: "generated-index",
            slug: "integrations/adapters",
          },
        },
        {
          type: "category",
          label: "Stores",
          collapsed: true,
          items: [
            {
              type: "autogenerated",
              dirName: "integrations/stores",
            },
          ],
          link: {
            type: "doc",
            id: "integrations/stores/index",
          },
        },
      ],
      link: {
        type: "generated-index",
        slug: "integrations/components",
      },
    },
  ],
  contributing: [
    {
      type: "category",
      label: "Contributing",
      items: [
        {
          type: "autogenerated",
          dirName: "contributing",
        },
      ],
    },
  ],
};
