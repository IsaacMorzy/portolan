// Parse a unified diff (as `git diff` produces) into the changed files and
// the lines added or removed in each one.
//
// Honest limits, stated rather than hidden:
// - Only the unified diff format is handled (`diff --git`, `---`/`+++`,
//   `@@` hunk headers, ` context`, `+added`, `-removed`).
// - Binary diffs, rename detection beyond what git prints, and patch hunks
//   without line numbers are not handled; they are skipped.
//
// Nothing here reaches the network or the file system: it parses a string
// that the caller obtained however they obtained it.

export type ChangedFile = {
  /** Repository-relative path, forward slashes. */
  path: string;
  /** Lines added, without the leading `+`. */
  added: string[];
  /** Lines removed, without the leading `-`. */
  removed: string[];
};

/** Parse a unified diff into per-file changes. */
export function parseDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  let current: ChangedFile | null = null;
  let inHunk = false;

  const lines = diff.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: `diff --git a/path b/path` or `diff --git a/path b/path `
    const fileHeader = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (fileHeader) {
      current = { path: fileHeader[1], added: [], removed: [] };
      files.push(current);
      inHunk = false;
      continue;
    }

    // `--- a/path` / `+++ b/path` — not needed beyond the header, but confirm
    // we are inside a file section.
    if (line.startsWith("--- ") || line.startsWith("+++ ")) continue;

    // Hunk header: `@@ -l,s +l,s @@ ...`
    if (/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(line)) {
      inHunk = true;
      continue;
    }

    if (!current || !inHunk) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      current.added.push(line.slice(1));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      current.removed.push(line.slice(1));
    }
    // Context lines (` `) and anything else are ignored.
  }

  return files;
}
