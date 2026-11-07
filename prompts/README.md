# prompts/

Every request gets written down here before it is executed.

## Why

A request arrives in shorthand. Executing the shorthand produces whatever the
first reading of it happened to be, and the reasoning that picked that reading
is gone by the time anyone asks "why did you build that". Writing the prompt
down first forces the ambiguous parts into the open while they are still cheap
to fix, and leaves a record of what was actually asked.

## The loop

1. **Rewrite.** Take the vanilla request and improve it with the
   `prompt-engineering-patterns` skill (and `enhance-prompt` when the target is
   UI). The rewrite names the goal, the constraints that already exist in this
   repo, what is out of scope, and how the result will be checked.
2. **Write it down.** `prompts/NNNN-<slug>.md`, numbered in order, never
   renumbered. The file holds the improved prompt, not a summary of the answer.
3. **Map it.** Run the `wayfinder` skill: what is a decision ticket, what is an
   implementation ticket, what is genuinely unknown. Ambiguity found here goes
   back to step 1 rather than being guessed at in code.
4. **Build it.** `ponytail` on by default. Stdlib before dependency, existing
   helper before new helper, deletion before addition.
5. **Check it.** Anything non-trivial leaves one runnable check behind; UI work
   gets a screenshot and a look, at more than one width.

Steps 1 and 3 are cheap. Skipping them is how a codebase ends up with features
nobody asked for and a diff nobody can review.

## What a prompt file contains

- **Ask** — what was requested, in the words it arrived in.
- **Reading** — the interpretation, and the alternatives that were rejected.
- **Scope** — in, out, and why the boundary sits there.
- **Done when** — the checks, written so they can be run.
- **Known unknowns** — what nobody has decided yet.

Keep it short. If it is longer than the work, the work was the thinking.
