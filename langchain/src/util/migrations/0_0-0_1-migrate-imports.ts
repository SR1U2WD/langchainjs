import { ImportSpecifier, Project, SourceFile, SyntaxKind } from "ts-morph";
import { glob } from "glob";
import path from "node:path";

type ExportedSymbol = { symbol: string; kind: SyntaxKind };

type EntrypointAndSymbols = {
  entrypoint: string;
  exportedSymbols: Array<ExportedSymbol>;
};

enum UpgradingModule {
  COHERE = "cohere",
  PINECONE = "pinecone",
}

/**
 * @param {string} entrypointFile
 * @param {Project} project
 * @returns {Array<EntrypointAndSymbols> }
 */
function getEntrypointsFromFile(
  entrypointFile: string,
  project: Project
): Array<EntrypointAndSymbols> {
  // load file contents from ts-morph
  const file = project.addSourceFileAtPath(entrypointFile);
  // extract the variable named entrypoints
  const entrypointVar = file.getVariableDeclarationOrThrow("entrypoints");
  // extract the `deprecatedNodeOnly` if it exists
  const deprecatedNodeOnlyVar =
    file.getVariableDeclaration("deprecatedNodeOnly");
  let deprecatedNodeOnly: Array<string> = [];
  if (deprecatedNodeOnlyVar) {
    const deprecatedNodeOnlyKeys = deprecatedNodeOnlyVar
      .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression)
      .getElements()
      .map((element) => element.getText().replaceAll('"', ""));
    deprecatedNodeOnly = deprecatedNodeOnlyKeys;
  }
  // get all keys from the entrypoints object
  const entrypointKeys = entrypointVar
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression)
    .getProperties()
    .map((property) => property.getText());
  const entrypointKeysArray = entrypointKeys.map((kv) =>
    kv.split(":").map((part) => part.trim().replace(/^"|"$/g, ""))
  );

  const entrypointsObject: Record<string, string> =
    Object.fromEntries(entrypointKeysArray);

  const result = Object.entries(entrypointsObject).flatMap(([key, value]) => {
    if (deprecatedNodeOnly.includes(key)) {
      return [];
    }
    const newFile = project.addSourceFileAtPath(
      path.join(
        entrypointFile.replace("scripts/create-entrypoints.js", "src"),
        `${value}.ts`
      )
    );
    const exportedSymbolsMap = newFile.getExportedDeclarations();
    const exportedSymbols = Array.from(exportedSymbolsMap.entries()).map(
      ([symbol, declarations]) => ({
        kind: declarations[0].getKind(),
        symbol,
      })
    );
    return {
      entrypoint: key,
      exportedSymbols,
    };
  });

  return result;
}

type FoundSymbol = {
  entrypoint: string;
  foundSymbol: string;
  packageSuffix: string;
};

/**
 * Finds a matching symbol in the array of exported symbols.
 * @param {{ symbol: string, kind: SyntaxKind }} target - The target symbol and its kind to find.
 * @param {Array<EntrypointAndSymbols>} exportedSymbols - The array of exported symbols to search.
 * @param {string} packageSuffix - The suffix of the package to import from. Eg, core
 * @returns {{ entrypoint: string, foundSymbol: string } | undefined} The matching symbol or undefined if not found.
 */
function findMatchingSymbol(
  target: { symbol: string; kind: SyntaxKind },
  exportedSymbols: Array<EntrypointAndSymbols>,
  packageSuffix: string
): FoundSymbol | undefined {
  for (const entry of exportedSymbols) {
    const foundSymbol = entry.exportedSymbols.find(
      ({ symbol, kind }) => symbol === target.symbol && kind === target.kind
    );
    if (foundSymbol) {
      return {
        entrypoint: entry.entrypoint,
        foundSymbol: foundSymbol.symbol,
        packageSuffix,
      }; // Return the matching entry object
    }
  }
  return undefined;
}

/**
 * @param {Array<EntrypointAndSymbols>} entrypoints
 * @returns {Array<EntrypointAndSymbols>}
 */
function removeLoad(
  entrypoints: Array<EntrypointAndSymbols>
): Array<EntrypointAndSymbols> {
  return entrypoints.flatMap((entrypoint) => {
    const newEntrypoint =
      entrypoint.entrypoint === "index" ? "" : `/${entrypoint.entrypoint}`;
    const withoutLoadOrIndex = entrypoint.exportedSymbols.filter((item) => {
      if (item.symbol === "load" && newEntrypoint === "load") {
        return false;
      }
      return true;
    });
    return {
      entrypoint: newEntrypoint,
      exportedSymbols: withoutLoadOrIndex,
    };
  });
}

function updateImport({
  matchingSymbols,
  namedImport,
  projectFile,
  namedImportText,
}: {
  matchingSymbols: Array<FoundSymbol | undefined>;
  namedImport: ImportSpecifier;
  projectFile: SourceFile;
  namedImportText: string;
}): boolean {
  const firstMatchingSymbol = matchingSymbols.find(
    (matchingSymbol) => matchingSymbol
  );
  if (firstMatchingSymbol) {
    console.debug(
      `Found matching symbol in the "@langchain/${firstMatchingSymbol.packageSuffix}" package.`,
      {
        matchingSymbol: firstMatchingSymbol,
      }
    );

    namedImport.remove();
    projectFile.addImportDeclaration({
      moduleSpecifier: `@langchain/${firstMatchingSymbol.packageSuffix}${firstMatchingSymbol.entrypoint}`,
      namedImports: [namedImportText],
    });
    return true;
  }
  return false;
}

/**
 * Find imports from deprecated pre 0.1 LangChain modules and update them to import
 * from the new LangChain packages.
 */
export async function updateEntrypointsFrom0_0_xTo0_1_x({
  localLangChainPath,
  codePath,
  customGlobPattern,
  customIgnorePattern,
  skipCheck,
}: {
  /**
   * The absolute path to the locally cloned LangChain repo root.
   * @example "/Users/username/code/langchainjs"
   */
  localLangChainPath: string;
  /**
   * The absolute path to the source directory of the codebase to update.
   * @example "/Users/username/code/my-project/src"
   */
  codePath: string;
  /**
   * Optionally, pass in a custom glob pattern to match files.
   * The backslash included in the example and default is only for
   * JSDoc to escape the asterisk. Do not include unless intentionally.
   * @example "/*.d.ts"
   * @default "**\/*.ts"
   */
  customGlobPattern?: string;
  /**
   * A custom ignore pattern for ignoring files.
   * The backslash included in the example and default is only for
   * JSDoc to escape the asterisk. Do not include unless intentionally.
   * @example {["**\/node_modules/**", "**\/dist/**", "**\/*.d.ts"]}
   * @default {["**\/node_modules/**", "**\/dist/**", "**\/*.d.ts"]}
   */
  customIgnorePattern?: string[] | string;
  /**
   * Optionally skip checking the passed modules for imports to
   * update.
   * @example [UpgradingModule.COHERE]
   * @default undefined
   */
  skipCheck?: Array<UpgradingModule>;
}) {
  const project = new Project();

  const langchainCorePackageEntrypoints = removeLoad(
    getEntrypointsFromFile(
      path.join(
        localLangChainPath,
        "langchain-core",
        "scripts",
        "create-entrypoints.js"
      ),
      project
    )
  );
  const langchainCommunityPackageEntrypoints = removeLoad(
    getEntrypointsFromFile(
      path.join(
        localLangChainPath,
        "libs",
        "langchain-community",
        "scripts",
        "create-entrypoints.js"
      ),
      project
    )
  );
  const langchainOpenAIPackageEntrypoints = removeLoad(
    getEntrypointsFromFile(
      path.join(
        localLangChainPath,
        "libs",
        "langchain-openai",
        "scripts",
        "create-entrypoints.js"
      ),
      project
    )
  );
  const langchainCoherePackageEntrypoints = !skipCheck?.includes(
    UpgradingModule.COHERE
  )
    ? removeLoad(
        getEntrypointsFromFile(
          path.join(
            localLangChainPath,
            "libs",
            "langchain-cohere",
            "scripts",
            "create-entrypoints.js"
          ),
          project
        )
      )
    : null;
  const langchainPineconePackageEntrypoints = !skipCheck?.includes(
    UpgradingModule.PINECONE
  )
    ? removeLoad(
        getEntrypointsFromFile(
          path.join(
            localLangChainPath,
            "libs",
            "langchain-pinecone",
            "scripts",
            "create-entrypoints.js"
          ),
          project
        )
      )
    : null;

  const globPattern = customGlobPattern || "/**/*.ts";
  const ignorePattern = customIgnorePattern || [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.d.ts",
  ];

  const allCodebaseFiles = glob
    .sync(path.join(codePath, globPattern), { ignore: ignorePattern })
    .map((filePath) => path.resolve(filePath));

  for await (const filePath of allCodebaseFiles) {
    const projectFile = project.addSourceFileAtPath(filePath);
    const imports = projectFile.getImportDeclarations();

    imports.forEach((importItem) => {
      // Get all imports
      const module = importItem.getModuleSpecifierValue();
      // Get only the named imports. Eg: import { foo } from "langchain/util";
      const namedImports = importItem.getNamedImports();
      if (!module.startsWith("langchain/")) {
        return;
      }

      // look at each import and see if it exists in
      let didUpdate = false;

      namedImports.forEach((namedImport) => {
        const namedImportText = namedImport.getText();
        let namedImportKind: SyntaxKind | null = null;

        const symbol = namedImport.getSymbol();
        if (symbol) {
          // Resolve alias symbol to its original symbol
          const aliasedSymbol = symbol.getAliasedSymbol() || symbol;

          // Get the original declarations of the symbol
          const declarations = aliasedSymbol.getDeclarations();
          if (declarations.length > 0) {
            // Assuming the first declaration is the original one
            const originalDeclarationKind = declarations[0].getKind();
            namedImportKind = originalDeclarationKind;
          }
        }

        // If we couldn't find the kind of the named imports kind, skip it
        if (!namedImportKind) {
          return;
        }

        const matchingSymbolCore = findMatchingSymbol(
          { symbol: namedImportText, kind: namedImportKind },
          langchainCorePackageEntrypoints,
          "core"
        );
        const matchingSymbolCommunity = findMatchingSymbol(
          { symbol: namedImportText, kind: namedImportKind },
          langchainCommunityPackageEntrypoints,
          "community"
        );
        const matchingSymbolOpenAI = findMatchingSymbol(
          { symbol: namedImportText, kind: namedImportKind },
          langchainOpenAIPackageEntrypoints,
          "openai"
        );
        const matchingSymbolCohere = langchainCoherePackageEntrypoints
          ? findMatchingSymbol(
              { symbol: namedImportText, kind: namedImportKind },
              langchainCoherePackageEntrypoints,
              "cohere"
            )
          : undefined;
        const matchingSymbolPinecone = langchainPineconePackageEntrypoints
          ? findMatchingSymbol(
              { symbol: namedImportText, kind: namedImportKind },
              langchainPineconePackageEntrypoints,
              "pinecone"
            )
          : undefined;

        didUpdate = updateImport({
          matchingSymbols: [
            matchingSymbolCore,
            matchingSymbolOpenAI,
            matchingSymbolCohere,
            matchingSymbolPinecone,
            matchingSymbolCommunity,
          ],
          namedImport,
          projectFile,
          namedImportText,
        });
      });

      if (didUpdate) {
        projectFile.saveSync();

        // Check if all named imports were removed, and only a file import remains.
        // eg: import { foo } from "langchain/anthropic"; -> import "langchain/anthropic";
        // if so, remove the import entirely
        const importClause = importItem.getImportClause();
        if (
          !importClause ||
          (!importClause.getDefaultImport() &&
            importClause.getNamedImports().length === 0)
        ) {
          importItem.remove();
          projectFile.saveSync();
        }
      }
    });
  }
}
