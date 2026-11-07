/**
 * Questions the product actually raises, answered from what the code does.
 * Native <details>, so it opens without JavaScript and the browser handles
 * the keyboard and the semantics — no accordion primitive, no dependency.
 */
const QUESTIONS = [
  {
    q: "Does it need access to my repository?",
    a: "No token and no OAuth. Portolan fetches the public default branch as an archive, records the commit it read, and pins the analysis to it. A later run reads the repository again rather than assuming it stayed still.",
  },
  {
    q: "What happens to a file the parser can't resolve?",
    a: "It is counted and shown beside the map. An import that cannot be resolved is not guessed at, and it is not dropped quietly either, so a gap in the picture is always traceable to a gap in the parse.",
  },
  {
    q: "Can the explanation invent a module?",
    a: "It is handed the parsed edges and asked to explain them, never to decide what exists. A claim it cannot tie to a file the parser read is dropped rather than softened, and the panel reports how many edges were cited against how many were found.",
  },
  {
    q: "Who else can see an analysis?",
    a: "Only members of the organization that created it. Every read is filtered by organization before it leaves the server, and the row policies that back that up are still in the database.",
  },
  {
    q: "Which repositories work?",
    a: "TypeScript, JavaScript and Python — Python resolved separately, because it has no type-only imports and no bundler aliases to inherit. The TS/JS side includes the aliases and re-exports that make resolution hard. Conventions for Next.js, React, Express, NestJS and Docusaurus are applied where they change what an import points at; anything else falls back to plain resolution.",
  },
];

export function Questions() {
  return (
    <section id="questions" className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16 md:py-28">
        <div>
          <h2 className="max-w-[16ch] text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[2rem]">
            What people ask before they paste a URL
          </h2>
          <p className="mt-4 max-w-[34ch] text-[0.9375rem] leading-relaxed text-fg-muted">
            Short answers, each one a statement about how the thing is built rather than a promise
            about how it will feel.
          </p>
        </div>

        <div className="border-t border-line">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-[0.9375rem] font-medium text-fg [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  className="mt-1.5 shrink-0 text-fg-muted transition-transform group-open:rotate-180"
                >
                  <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="max-w-[52ch] pb-5 text-[0.875rem] leading-relaxed text-fg-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
