import { railCategories, railLabel, type ModelRole } from "@/lib/roles";
import type { ParsedFile } from "@/lib/parser/types";

// The categories are the roles the repository's frameworks define, in the
// taxonomy's fixed order, with every one of them listed even at zero so each
// sits in the same place every time. Clicking one dims what isn't in it on the
// map rather than hiding it, so the shape of the whole repository stays on
// screen. Clicking it again, or another one, moves on.
export function CategoryRail({
  files,
  modelRoles,
  frameworks,
  active,
  onToggle,
}: {
  files: ParsedFile[];
  /** Roles the model gave files convention left unclassified; they count in their role's row. */
  modelRoles: ReadonlyMap<string, ModelRole>;
  /** The adapter of every project in the repository. */
  frameworks: string[];
  active: string | null;
  /**
   * A role key, or `pkg:<name>` for a package row. String, not RailKey: the rail
   * now carries two kinds of key and the map's focus matches on whichever was
   * clicked.
   */
  onToggle: (category: string) => void;
}) {
  const categories = railCategories(
    frameworks,
    files.map((f) => f.role ?? modelRoles.get(f.path) ?? null),
  );

  // Packages, when the repository has more than one. A single package is the
  // repository, so a list of one would be decoration; a monorepo's crossing
  // packages are the thing Nx shows and this map did not.
  const packages = new Map<string, number>();
  for (const file of files) {
    if (file.pkg) packages.set(file.pkg, (packages.get(file.pkg) ?? 0) + 1);
  }
  const packageRows = [...packages.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (
    <div className="py-2">
      <h2 className="px-3 pb-1 text-[11px] text-fg-muted">
        Categories <span className="tabular-nums">· {files.length} files</span>
      </h2>
      <ul>
        {categories.map(({ key, count }) => {
          const on = active === key;
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={on}
                disabled={count === 0}
                onClick={() => onToggle(key)}
                className={`flex h-6 w-full items-center gap-2 px-3 text-left text-xs disabled:text-fg-muted ${
                  on ? "bg-accent/15 shadow-[inset_2px_0_0_var(--accent)]" : active ? "text-fg-muted enabled:hover:bg-raised" : "enabled:hover:bg-raised"
                }`}
              >
                <span className="flex-1 truncate">{railLabel(key)}</span>
                <span className="text-fg-muted tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {packageRows.length > 1 ? (
        <div className="mt-3 border-t border-line pt-2">
          <h2 className="px-3 pb-1 text-[11px] text-fg-muted">
            Packages <span className="tabular-nums">· {packageRows.length}</span>
          </h2>
          <ul>
            {packageRows.map(([name, count]) => {
              const key = `pkg:${name}`;
              const on = active === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(key)}
                    className={`flex h-6 w-full items-center gap-2 px-3 text-left text-xs ${
                      on
                        ? "bg-accent/15 shadow-[inset_2px_0_0_var(--accent)]"
                        : active
                          ? "text-fg-muted hover:bg-raised"
                          : "hover:bg-raised"
                    }`}
                  >
                    <span className="flex-1 truncate">{name}</span>
                    <span className="text-fg-muted tabular-nums">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
