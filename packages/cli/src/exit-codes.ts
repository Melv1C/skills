export const ExitCode = {
  OK: 0,
  USAGE: 1,
  AUTH: 2,
  API: 3,
  NETWORK: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];
