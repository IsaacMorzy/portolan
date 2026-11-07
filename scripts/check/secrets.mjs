// Secrets: nothing that authenticates leaves this machine in a commit.
//
// This repo has already leaked twice — a Vercel token and a Cerebras key both
// appeared in a chat transcript, and the only reason neither reached git is that
// nobody happened to commit the file they were pasted into. That is luck, not a
// control.
//
// Two checks, because there are two ways to leak:
//   1. An env file gets staged. Entire files, so no pattern has to be guessed.
//   2. A credential is pasted into source, a fixture, or a doc — under a name
//      that matches a known issuer, or shaped like one regardless of name.
//
// Deliberately not a scanner for "high entropy strings": that flags git SHAs,
// hashes of prompt versions and base64 fixtures, which are all over this repo. A
// check that cries wolf gets removed, and a removed check protects nothing.
//
// Run: node scripts/check/secrets.mjs [--staged]

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const STAGED = process.argv.includes("--staged");

/** Whole files that must never be committed. */
const FORBIDDEN_FILES = [/^\.env($|\.)/, /^\.env\.local$/, /\.pem$/, /\.p12$/, /^id_rsa/, /\.key$/];

/** Shapes that are a credential whoever they belong to. */
const SHAPES = [
  { id: "vercel", re: /\bvcp_[A-Za-z0-9]{20,}/g, what: "Vercel access token" },
  { id: "openai-style", re: /\b(sk|csk)-[A-Za-z0-9_-]{24,}/g, what: "API key (sk-/csk-)" },
  { id: "github", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g, what: "GitHub token" },
  { id: "clerk-secret", re: /\bsk_(live|test)_[A-Za-z0-9]{20,}/g, what: "Clerk secret key" },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\./g, what: "JWT" },
  { id: "aws", re: /\bAKIA[0-9A-Z]{16}\b/g, what: "AWS access key id" },
  { id: "supabase-service", re: /\bSUPABASE_SECRET_KEY\s*=\s*["']?[A-Za-z0-9_-]{20,}/g, what: "Supabase secret key assignment" },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, what: "private key block" },
];

/**
 * Files that legitimately name a key without holding one. `.env.example` is the
 * one place a variable name must appear with an empty value.
 */
const NAME_ONLY = new Set([".env.example", "scripts/check/secrets.mjs"]);

const files = STAGED
  ? execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" }).trim().split("\n").filter(Boolean)
  // -c cached + -o other, so an untracked file is scanned before it is staged.
  // Scanning only tracked files means a secret written today is invisible until
  // the moment it is committed, which is the moment it matters.
  : execSync("git ls-files -co --exclude-standard", { encoding: "utf8" }).trim().split("\n").filter(Boolean);

const findings = [];

for (const file of files) {
  const base = file.split("/").pop() ?? file;
  if (FORBIDDEN_FILES.some((re) => re.test(base) || re.test(file))) {
    // .env.example is a template with empty values and is meant to be committed.
    if (file !== ".env.example") {
      findings.push({ file, line: 0, id: "env-file", hit: file, why: "Environment files are never committed. Secrets live in .env.local (chmod 600, gitignored) and in the deploy target's encrypted env." });
      continue;
    }
  }

  if (NAME_ONLY.has(file)) continue;

  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binary or unreadable
  }
  if (text.includes("\u0000")) continue;

  text.split("\n").forEach((line, i) => {
    for (const shape of SHAPES) {
      shape.re.lastIndex = 0;
      const match = shape.re.exec(line);
      if (!match) continue;
      // A line that assigns a name to a placeholder is documentation, not a leak:
      //   CEREBRAS_API_KEY=""   or   const KEY = process.env.X ?? ""
      if (/(?:=|:)\s*["']?\s*$/.test(line.slice(0, match.index + 1))) continue;
      findings.push({
        file,
        line: i + 1,
        id: shape.id,
        // Never echo the secret itself, not even truncated: the terminal scrolls,
        // gets screenshotted, and the check has just printed it into history.
        hit: `${match[0].slice(0, 4)}…(${match[0].length} chars)`,
        why: `${shape.what}. If this is real, rotate it and move it to .env.local.`,
      });
    }
  });
}

if (findings.length === 0) {
  console.log(`no secrets in ${files.length} files`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${f.file}:${f.line}  [${f.id}] ${f.hit}`);
  console.error(`    ${f.why}`);
}
console.error(`\n${findings.length} finding(s). A leaked key is rotated, never just deleted from the diff.`);
process.exit(1);
