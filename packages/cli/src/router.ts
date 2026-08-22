import path from "node:path";

import { assetsPushAction } from "./commands/assets";
import { publishDocument } from "./commands/docs";
import { getClient } from "./context";
import { isJsonMode } from "./output-mode";
import { emit, printLine } from "./printer";

type RouterOptions = Parameters<typeof assetsPushAction>[1] & Parameters<typeof publishDocument>[2];

function isHtmlFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  return ext === ".html" || ext === ".htm";
}

export async function pushRouterAction(files: string[], options: RouterOptions): Promise<void> {
  const htmlFiles = files.filter(isHtmlFile);
  const assetFiles = files.filter((file) => !isHtmlFile(file));

  if (assetFiles.length > 0) {
    await assetsPushAction(assetFiles, options);
  }

  if (htmlFiles.length > 0) {
    const client = await getClient(options);
    const published = [];
    for (const file of htmlFiles) {
      const { document, created } = await publishDocument(client, file, options);
      published.push(document);
      if (!isJsonMode()) {
        printLine(
          `${file} → ${document.url} (${created ? "created" : "updated"}, v${document.version})`,
        );
      }
    }
    if (isJsonMode()) {
      emit({ assets: [], documents: published });
    }
  }
}
