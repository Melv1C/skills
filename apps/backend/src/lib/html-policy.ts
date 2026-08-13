import * as parse5 from "parse5";

const BLOCKED_TAGS = new Set([
  "form",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "base",
  "link",
]);

const URL_ATTRS = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "poster",
  "srcdoc",
  "xlink:href",
]);

const BLOCKED_PROTOCOLS = ["javascript:", "vbscript:", "file:"];
const ALLOWED_SCRIPT_TYPES = new Set(["", "text/javascript", "application/javascript"]);
const MAX_DEPTH = 512;

type WalkNode = {
  tagName?: string;
  nodeName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: WalkNode[];
};

export type HtmlPolicyResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  title: string | null;
  hasInlineScript: boolean;
};

export function validateHtml(html: string, options: { maxBytes?: number } = {}): HtmlPolicyResult {
  const maxBytes = options.maxBytes ?? 512 * 1024;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof html !== "string" || html.trim() === "") {
    return {
      ok: false,
      errors: ["HTML document is empty."],
      warnings: [],
      title: null,
      hasInlineScript: false,
    };
  }

  const byteLength = Buffer.byteLength(html, "utf8");
  if (byteLength > maxBytes) {
    errors.push(`HTML document is ${byteLength} bytes; maximum is ${maxBytes} bytes.`);
  }

  let document: WalkNode;
  try {
    document = parse5.parse(html, { scriptingEnabled: false }) as WalkNode;
  } catch {
    return {
      ok: false,
      errors: ["HTML document could not be parsed."],
      warnings: [],
      title: null,
      hasInlineScript: false,
    };
  }

  let title: string | null = null;
  let hasInlineScript = false;
  let tooDeep = false;

  function visit(node: WalkNode) {
    if (node.tagName) {
      const tagName = node.tagName.toLowerCase();

      if (BLOCKED_TAGS.has(tagName)) {
        errors.push(`Blocked <${tagName}> tag found.`);
      }

      if (tagName === "script") {
        hasInlineScript = true;
        const attributes = new Map(
          (node.attrs ?? []).map((attr) => [
            attr.name.toLowerCase(),
            String(attr.value || "").trim(),
          ]),
        );
        if (attributes.has("src")) {
          errors.push("External script sources are not allowed.");
        }

        const scriptType = (attributes.get("type") || "").toLowerCase();
        if (!ALLOWED_SCRIPT_TYPES.has(scriptType)) {
          errors.push(`Unsupported script type "${scriptType}" found.`);
        }
      }

      for (const attr of node.attrs ?? []) {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "").trim();

        if (name.startsWith("on")) {
          errors.push(`Blocked inline event handler attribute "${name}" found.`);
        }

        if (name === "srcdoc") {
          errors.push('Blocked "srcdoc" attribute found.');
        }

        if (URL_ATTRS.has(name)) {
          const normalized = stripUrlNoise(value);
          if (BLOCKED_PROTOCOLS.some((protocol) => normalized.startsWith(protocol))) {
            errors.push(`Blocked unsafe URL in "${name}" attribute.`);
          }
        }

        if (
          name === "style" &&
          /expression\s*\(|behavior\s*:|url\s*\(\s*javascript:/i.test(value)
        ) {
          errors.push("Blocked unsafe inline CSS.");
        }
      }

      if (tagName === "meta") {
        const httpEquiv = (node.attrs ?? []).find(
          (attr) => attr.name.toLowerCase() === "http-equiv",
        );
        if (httpEquiv && httpEquiv.value.trim().toLowerCase() === "refresh") {
          errors.push("Blocked meta refresh tag found.");
        }
      }
    }

    if (node.tagName === "title" && !title) {
      title = collectText(node).trim().slice(0, 140) || null;
    }
  }

  const stack: { node: WalkNode; depth: number }[] = [{ node: document, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    visit(current.node);
    if (current.depth >= MAX_DEPTH) {
      tooDeep = true;
      continue;
    }
    const children = current.node.childNodes ?? [];
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) stack.push({ node: child, depth: current.depth + 1 });
    }
  }

  if (tooDeep) {
    errors.push(`HTML is nested more than ${MAX_DEPTH} levels deep.`);
  }

  if (!title) {
    warnings.push("No <title> found; a generic title will be used.");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    title,
    hasInlineScript,
  };
}

function stripUrlNoise(value: string) {
  let out = "";
  for (const char of value) {
    if (char.charCodeAt(0) > 32) out += char;
  }
  return out.toLowerCase();
}

function collectText(node: WalkNode): string {
  let value = "";
  for (const child of node.childNodes ?? []) {
    if (child.nodeName === "#text") value += child.value || "";
    value += collectText(child);
  }
  return value;
}
