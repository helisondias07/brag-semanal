const TOKEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "github_token", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { name: "github_pat", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: "openai_like", re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "bearer", re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi },
  { name: "password_assignment", re: /\b(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*['"]?[^\s'"]+/gi },
  { name: "email", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
];

const SECRET_QUERY_KEYS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "key",
  "password",
  "secret",
  "authorization",
  "auth",
]);

const ALLOWED_URL_PROTOCOLS = new Set(["https:", "http:"]);

export interface RedactionResult {
  text: string;
  hits: string[];
}

export function redactText(input: string): RedactionResult {
  let text = input;
  const hits: string[] = [];
  for (const pattern of TOKEN_PATTERNS) {
    if (pattern.re.test(text)) {
      hits.push(pattern.name);
      text = text.replace(pattern.re, `[REDACTED:${pattern.name}]`);
    }
    pattern.re.lastIndex = 0;
  }
  return { text, hits };
}

export interface UrlSanitizeResult {
  ok: boolean;
  url?: string;
  rejected?: string;
}

export function sanitizeUrl(raw: string): UrlSanitizeResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, rejected: "empty_url" };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, rejected: "unparseable_url" };
  }
  if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, rejected: `rejected_protocol:${parsed.protocol}` };
  }
  if (parsed.username || parsed.password) {
    parsed.username = "";
    parsed.password = "";
  }
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(parsed.hostname) === false) {
    // still allow synthetic example hosts
  }
  const params = parsed.searchParams;
  for (const key of [...params.keys()]) {
    if (SECRET_QUERY_KEYS.has(key.toLowerCase())) {
      params.set(key, "REDACTED");
    }
  }
  parsed.hash = "";
  const out = parsed.toString();
  const redacted = redactText(out);
  return { ok: true, url: redacted.text };
}

export function redactRecord<T>(record: T, log: string[]): T {
  const clone = structuredClone(record);
  walk(clone, log, "$");
  return clone;
}

function walk(value: unknown, log: string[], path: string): unknown {
  if (typeof value === "string") {
    if (path.endsWith(".url") || path.endsWith(".canonicalUrl") || /url$/i.test(path)) {
      const sanitized = sanitizeUrl(value);
      if (!sanitized.ok) {
        log.push(`${path}: ${sanitized.rejected}`);
        return value;
      }
      if (sanitized.url !== value) {
        log.push(`${path}: url_sanitized`);
      }
      return sanitized.url;
    }
    const result = redactText(value);
    if (result.hits.length) {
      log.push(`${path}: ${result.hits.join(",")}`);
    }
    return result.text;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = walk(value[i], log, `${path}[${i}]`);
    }
    return value;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      (value as Record<string, unknown>)[k] = walk(v, log, `${path}.${k}`);
    }
  }
  return value;
}
