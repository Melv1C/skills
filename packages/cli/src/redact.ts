const KEY_RE = /av_[A-Za-z0-9_-]{8,}/g;

export function redact(text: string): string {
  return text.replace(KEY_RE, "av_***");
}
