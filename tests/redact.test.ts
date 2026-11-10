import { describe, expect, it } from "vitest";
import { redactRecord, redactText, sanitizeUrl } from "../src/redact.ts";

describe("redaction isolada", () => {
  it("redige texto e URLs incluindo query/userinfo", () => {
    const text = redactText("token ghp_AAAAAAAAAAAAAAAAAAAAAAAAAA999999 email bob@corp.example password=hunter2");
    expect(text.text).toContain("[REDACTED:github_token]");
    expect(text.text).toContain("[REDACTED:email]");
    expect(text.text).toContain("[REDACTED:password_assignment]");
    const url = sanitizeUrl("https://alice:secret@example.invalid/x?access_token=abcd&ok=1");
    expect(url.ok).toBe(true);
    expect(url.url).not.toContain("alice");
    expect(url.url).not.toContain("secret");
    expect(url.url).toMatch(/REDACTED/);
    expect(sanitizeUrl("javascript:alert(1)").ok).toBe(false);
    expect(sanitizeUrl("data:text/html;base64,AAAA").ok).toBe(false);
    const log: string[] = [];
    const rec = redactRecord({ body: "sk-abcdefghijklmnopqrstuvwxyz123456", url: "https://example.invalid/?api_key=zzz" }, log);
    expect(String(rec.body)).toContain("[REDACTED");
    expect(log.join(" ")).not.toMatch(/sk-abcdefghijklmnopqrstuvwxyz123456/);
  });
});
