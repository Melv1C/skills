import { CliError } from "./errors";
import { ExitCode } from "./exit-codes";
import { isJsonMode } from "./output-mode";
import { redact } from "./redact";

export function printLine(text: string): void {
  process.stdout.write(`${redact(text)}\n`);
}

export function printErrorLine(text: string): void {
  process.stderr.write(`${redact(text)}\n`);
}

export function printJson(data: unknown): void {
  process.stdout.write(`${redact(JSON.stringify(data, null, 2))}\n`);
}

export function emit(data: unknown): void {
  if (isJsonMode()) printJson(data);
}

export function failWith(error: unknown): number {
  if (error instanceof CliError) {
    printErrorLine(`error: ${error.message}`);
    for (const detail of error.details) {
      printErrorLine(`  - ${detail}`);
    }
    return error.exitCode;
  }
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  printErrorLine(message);
  return ExitCode.NETWORK;
}
