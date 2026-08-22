import { Command } from "commander";

import packageJson from "../package.json";
import {
  assetsListAction,
  assetsPushAction,
  assetsRemoveAction,
  type UploadOptions,
} from "./commands/assets";
import { loginAction, logoutAction, whoamiAction } from "./commands/auth";
import {
  docsListAction,
  docsPublishAction,
  docsRemoveAction,
  type PublishOptions,
} from "./commands/docs";
import { ExitCode } from "./exit-codes";
import { setJsonMode } from "./output-mode";
import { failWith, printErrorLine } from "./printer";
import { pushRouterAction } from "./router";

const DEFAULT_BASE_URL = "https://api.skills.melvyn.be";

type GlobalOptions = {
  baseUrl?: string;
  token?: string;
};

function run<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  return async (...args: [...A]) => {
    try {
      await action(...args);
    } catch (error) {
      process.exitCode = failWith(error);
    }
  };
}

function globalOpts(cmd: Command): GlobalOptions {
  return cmd.opts<GlobalOptions & { json?: boolean }>();
}

async function main(): Promise<number> {
  const program = new Command();
  program
    .name("melv1c-skills")
    .description("Upload assets and HTML documents to api.skills.melvyn.be")
    .version(packageJson.version)
    .option(
      "--base-url <url>",
      `override the API base URL (default: ${DEFAULT_BASE_URL}, env: SKILLS_API_BASE)`,
    )
    .option(
      "--token <key>",
      "use this API key for this invocation (warning: can land in shell history)",
    )
    .option("--json", "emit machine-readable JSON output");

  program.hook("preAction", () => {
    const opts = program.opts<{ json?: boolean }>();
    setJsonMode(opts.json === true);
  });

  const auth = program.command("auth").description("manage stored credentials");
  auth
    .command("login")
    .description("validate an av_ API key and store it locally")
    .option("--token <key>", "provide the key instead of prompting (can land in shell history)")
    .option("--rotate", "replace an already-stored key after validating the new one")
    .action(
      run(async (options: { token?: string; rotate?: boolean }) => {
        const globals = globalOpts(program);
        await loginAction({ ...options, baseUrl: globals.baseUrl });
      }),
    );

  auth.command("logout").description("remove the stored key").action(run(logoutAction));

  program
    .command("whoami")
    .description("show which credential source is in effect and validate it")
    .action(
      run(async () => {
        await whoamiAction(globalOpts(program));
      }),
    );

  const assets = program.command("assets").description("upload and manage media files");
  assets
    .command("push")
    .argument("<files...>")
    .description("upload media (png, jpg, gif, webp, webm, mp4, pdf)")
    .option("--public", "make the asset publicly fetchable")
    .option("--private", "restrict fetching to authenticated requests (default)")
    .option("--name <filename>", "override display filename (single file only)")
    .action(
      run(
        async (
          files: string[],
          options: { public?: boolean; private?: boolean; name?: string },
        ) => {
          const globals = globalOpts(program);
          const upload: UploadOptions = {
            ...globals,
            visibility: options.public ? "public" : options.private ? "private" : undefined,
            name: options.name,
          };
          await assetsPushAction(files, upload);
        },
      ),
    );
  assets
    .command("ls")
    .description("list your assets")
    .option("--limit <n>", "max items to return", Number.parseInt)
    .option("--cursor <id>", "continue from a previous page")
    .action(
      run(async (options: { limit?: number; cursor?: string }) => {
        await assetsListAction({ ...globalOpts(program), ...options });
      }),
    );
  assets
    .command("rm")
    .argument("<ids...>")
    .description("delete assets by id")
    .option("-f, --force", "delete without confirmation")
    .action(
      run(async (ids: string[], options: { force?: boolean }) => {
        await assetsRemoveAction(ids, { ...globalOpts(program), ...options });
      }),
    );

  const docs = program.command("docs").description("publish and manage hosted HTML documents");
  docs
    .command("publish")
    .argument("<files...>")
    .description("upsert HTML documents (.html); re-publishing the same path updates the same URL")
    .option("--description <text>", "attach a description")
    .option("--new-draft", "force a new document instead of updating via clientKey")
    .option("--client-key <key>", "explicit stable key for update-in-place semantics")
    .option("--public", "publish publicly")
    .option("--private", "keep private (default)")
    .action(
      run(
        async (
          files: string[],
          options: {
            public?: boolean;
            private?: boolean;
            description?: string;
            newDraft?: boolean;
            clientKey?: string;
          },
        ) => {
          const globals = globalOpts(program);
          const publish: PublishOptions = {
            ...globals,
            visibility: options.public ? "public" : options.private ? "private" : undefined,
            description: options.description,
            newDraft: options.newDraft === true,
            clientKey: options.clientKey,
          };
          await docsPublishAction(files, publish);
        },
      ),
    );
  docs
    .command("ls")
    .description("list your documents")
    .option("--limit <n>", "max items to return", Number.parseInt)
    .option("--cursor <id>", "continue from a previous page")
    .action(
      run(async (options: { limit?: number; cursor?: string }) => {
        await docsListAction({ ...globalOpts(program), ...options });
      }),
    );
  docs
    .command("rm")
    .argument("<id>")
    .description("delete a document by id")
    .action(
      run(async (id: string) => {
        await docsRemoveAction(id, globalOpts(program));
      }),
    );

  const push = program
    .command("push")
    .description("route files by type: .html → docs, else → assets");
  push
    .argument("<files...>")
    .option("--public", "make uploads publicly fetchable")
    .option("--private", "restrict fetching to authenticated requests (default)")
    .option("--description <text>", "description for .html files")
    .option("--new-draft", "force new documents instead of updating in place")
    .action(
      run(async (files: string[], options: Record<string, unknown>) => {
        const globals = globalOpts(program);
        const merged = {
          ...globals,
          visibility:
            options.public === true
              ? ("public" as const)
              : options.private === true
                ? ("private" as const)
                : undefined,
          description: typeof options.description === "string" ? options.description : undefined,
          newDraft: options.newDraft === true,
        };
        await pushRouterAction(files, merged);
      }),
    );

  await program.parseAsync();
  return (process.exitCode ?? ExitCode.OK) as number;
}

main().catch((error: unknown) => {
  printErrorLine(`unexpected error: ${String(error)}`);
  process.exit(ExitCode.NETWORK);
});
