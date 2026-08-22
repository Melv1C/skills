import path from "node:path";

import { pushAsset, type UploadOptions } from "./commands/assets";
import { publishDocument, type PublishOptions } from "./commands/docs";
import { getClient } from "./context";
import type { AssetDto, DocumentDto } from "./dto";
import { CliError } from "./errors";
import { ExitCode } from "./exit-codes";
import { isJsonMode } from "./output-mode";
import { emit, printLine } from "./printer";

type RouterOptions = UploadOptions & PublishOptions;

function isHtmlFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  return ext === ".html" || ext === ".htm";
}

export async function pushRouterAction(files: string[], options: RouterOptions): Promise<void> {
  if (options.name && files.length > 1) {
    throw new CliError("--name applies to a single file only.", ExitCode.USAGE);
  }

  const client = await getClient(options);
  const assets: Array<{ file: string; asset: AssetDto }> = [];
  const documents: Array<{ file: string; document: DocumentDto; created: boolean }> = [];

  for (const file of files.filter((f) => !isHtmlFile(f))) {
    assets.push({ file, asset: await pushAsset(client, file, options) });
  }
  for (const file of files.filter(isHtmlFile)) {
    const result = await publishDocument(client, file, options);
    documents.push({ file, document: result.document, created: result.created });
  }

  if (isJsonMode()) {
    emit({
      assets: assets.map((entry) => entry.asset),
      documents: documents.map((entry) => entry.document),
    });
    return;
  }

  for (const { file, asset } of assets) {
    printLine(`${file} → ${asset.url}`);
    printLine(asset.markdown);
  }
  for (const { file, document, created } of documents) {
    printLine(
      `${file} → ${document.url} (${created ? "created" : "updated"}, v${document.version})`,
    );
  }
}
