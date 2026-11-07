import { ImageResponse } from "next/og";

/**
 * The card that appears when this link is pasted somewhere.
 *
 * Generated rather than stored: a static PNG would be a file nobody notices is
 * out of date, and this page's whole claim is that it is read from the source.
 * It uses the same tokens as the site, so the card cannot drift from the brand
 * it is advertising.
 *
 * No emoji, no gradient, no invented stat — the text is the page's own h1 and
 * the one line under it.
 */

export const alt = "Cartograph — a dependency map of your codebase, parsed not inferred";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0c0d",
          color: "#e6e6e9",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#4f8bff" }} />
          <div style={{ fontSize: 30, letterSpacing: "-0.01em" }}>Cartograph</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Broken by hand. Left to wrap, "on." fell to its own line and the
              card read as though it had run out of room. */}
          {/* display:flex is not optional here — Satori refuses a node with
              more than one child unless it is told how to lay them out. */}
          <div style={{ display: "flex", flexDirection: "column", fontSize: 66, lineHeight: 1.12, letterSpacing: "-0.03em" }}>
            <div>See what your code</div>
            <div>depends on.</div>
          </div>
          <div style={{ fontSize: 28, color: "#9d9da7", maxWidth: 820 }}>
            Every edge resolved by the parser, every explanation cited to a file it actually read.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 22, color: "#9d9da7" }}>
          <div>TypeScript</div>
          <div style={{ color: "#3f3f47" }}>/</div>
          <div>Parsed, not inferred</div>
          <div style={{ color: "#3f3f47" }}>/</div>
          <div>Scoped per organization</div>
        </div>
      </div>
    ),
    size,
  );
}
