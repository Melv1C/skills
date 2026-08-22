import { ApiClient } from "./api";
import { resolveBaseUrl, resolveTokenWithFile } from "./auth";
import { CliError } from "./errors";
import { ExitCode } from "./exit-codes";

export interface CommandContextOptions {
  baseUrl?: string;
  token?: string;
}

export async function getClient(options: CommandContextOptions): Promise<ApiClient> {
  const resolved = await resolveTokenWithFile(options.token).catch(() => null);
  if (!resolved) {
    throw new CliError(
      "Not authenticated. Set SKILLS_API_TOKEN or run `melv1c-skills auth login`.",
      ExitCode.AUTH,
    );
  }
  return new ApiClient(resolveBaseUrl(options.baseUrl), resolved.token);
}
