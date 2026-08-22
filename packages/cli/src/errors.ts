import type { ExitCodeValue } from "./exit-codes";
import { ExitCode } from "./exit-codes";

export class CliError extends Error {
  readonly exitCode: number;
  readonly details: string[];

  constructor(message: string, exitCode: ExitCodeValue = ExitCode.USAGE, details: string[] = []) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.details = details;
  }
}

export function messageOf(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}
