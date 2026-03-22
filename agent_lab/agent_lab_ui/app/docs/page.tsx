import Link from "next/link";

/** Full-page peach / cream documentation theme (matches AppShell on /docs). */
const THEME = {
  pageBg: "#faf6f1",
  pageBgElev: "#fffbf7",
  border: "#e8ddd4",
  text: "#44403c",
  mutedQuiet: "#78716c",
  codeBg: "#f3ebe4",
  codeFg: "#1c1917",
  codeBorder: "#d6cbc1",
  tableHeadBg: "#f5ebe4",
  inlineCodeBg: "rgba(243, 235, 228, 0.95)",
  stepBadgeBg: "rgba(234, 88, 12, 0.1)",
} as const;

type DocsSection = {
  title: string;
  steps?: { cmd: string; desc: string }[];
  rows?: [string, string][];
  numbered?: { title: string; description: string }[];
};

const sections: DocsSection[] = [
  {
    title: "Quick start",
    steps: [
      {
        cmd: "agentlab init",
        desc: "Initialise a project directory — creates agentlab.db and .agentlab/",
      },
      {
        cmd: "agentlab eval --limit 5",
        desc: "Run evaluation on 5 samples and auto-snapshot the agent code",
      },
      {
        cmd: "agentlab ui",
        desc: "Start the FastAPI backend (port 8000) + Next.js dashboard (port 3001)",
      },
      {
        cmd: "agentlab rollback <tag>",
        desc: "Restore the agent code from a previously captured snapshot",
      },
    ],
  },
  {
    title: "Onboarding: single-agent architecture",
    numbered: [
      {
        title: "Install and environment",
        description:
          "Install AgentLab in the same Python environment as your agent (pip / uv). Set OPENAI_API_KEY for the model your graph uses. If you want execution traces in the dashboard, run Langfuse locally (or use cloud) and set the Langfuse host and keys AgentLab expects in your .env.",
      },
      {
        title: "One repo, one entrypoint",
        description:
          "Use a single codebase with one callable your eval will invoke — typically run_agent (or equivalent) in something like src/graph.py. Keep tools and prompts in that tree so every eval snapshot captures the full behaviour surface.",
      },
      {
        title: "Golden dataset (JSONL)",
        description:
          "Add datasets/evals.jsonl (or any path) with one JSON object per line. Each row should include the user input key and the expected output key you will reference in agent-eval.yml.",
      },
      {
        title: "Wire agent-eval.yml",
        description:
          "At the repo root, add agent-eval.yml: set agent.entrypoint (e.g. src.graph:run_agent), dataset.path, dataset.input_key, dataset.expected_output_key, and match_mode (exact or contains). This is the contract between your agent and AgentLab.",
      },
      {
        title: "Initialise the workspace",
        description:
          "From the agent project root, run agentlab init. That creates the local SQLite history (.agentlab / agentlab.db) so runs, tags, and snapshots are recorded for this agent only.",
      },
      {
        title: "First evaluation run",
        description:
          "Run agentlab eval (use --limit N while iterating). AgentLab loads your graph, runs each dataset row, scores pass/fail, writes aggregates to SQLite, and stores a content-addressed snapshot of src for that tag.",
      },
      {
        title: "Inspect in the UI",
        description:
          "Run agentlab ui, open the dashboard, and select this project if you have several. Open a run by tag to see per-sample results, traces (when Langfuse is configured), snapshots (prompt / model / tools), feedback, and suggestions.",
      },
      {
        title: "Change, diff, rollback",
        description:
          "Edit your agent, eval again to get a new tag, then use the diff viewer to compare behaviour and metrics. If a version regresses, use agentlab rollback <tag> to restore files from a snapshot before re-running evals.",
      },
    ],
  },
  {
    title: "Evaluation config (agent-eval.yml)",
    rows: [
      ["agent.entrypoint", "Python import path to run_agent function, e.g. src.graph:run_agent"],
      ["dataset.path", "Relative path to JSONL dataset, e.g. datasets/evals.jsonl"],
      ["dataset.input_key", "Key in each JSONL row that holds the user question"],
      ["dataset.expected_output_key", "Key holding the expected answer"],
      ["dataset.match_mode", '"exact" (default) or "contains" for substring matching'],
    ],
  },
  {
    title: "Dashboard routes",
    rows: [
      ["/", "Landing page — overview of features"],
      ["/dashboard", "Evaluation overview — metric cards, version chart, version history table"],
      ["/run/[tag]", "Per-run detail — sample results, trace logs, RAGAS scores, LLM suggestions"],
      ["/diff", "Side-by-side comparison of two versions — metrics, traces, system prompt diff"],
    ],
  },
  {
    title: "HTTP API reference",
    rows: [
      ["GET /api/versions", "All run history for a project"],
      ["GET /api/samples/{tag}", "Per-sample results for a version"],
      ["GET /api/traces/{tag}", "Execution chain trace from Langfuse"],
      ["GET /api/snapshot/{tag}", "Captured snapshot metadata (system prompt, model, tools)"],
      ["GET /api/diff/{v1}/{v2}", "Metric deltas + LLM behavioral summary"],
      ["POST /api/feedback", "Save thumbs up/down + comment for a sample"],
      ["POST /api/suggest/{tag}", "LLM-generated improvement suggestions"],
      ["POST /api/apply-suggestion/{tag}", "Apply a system prompt change to graph.py"],
      ["GET /api/export-rlhf/{tag}", "Download DPO-format JSONL dataset"],
    ],
  },
];

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      className="my-0 overflow-x-auto rounded-md border px-3 py-2.5 font-mono text-[12.5px] leading-relaxed shadow-sm sm:text-[13px]"
      style={{
        background: THEME.codeBg,
        borderColor: THEME.codeBorder,
        color: THEME.codeFg,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  const toc = sections.map((s) => ({ id: slugify(s.title), title: s.title }));

  return (
    <div
      className="relative -mx-6 min-w-0 w-[calc(100%+3rem)] max-w-none px-6 pb-24 pt-2 sm:w-[calc(100%+3rem)]"
      style={{
        background: `linear-gradient(180deg, ${THEME.pageBgElev} 0%, ${THEME.pageBg} 32%, ${THEME.pageBg} 100%)`,
        color: THEME.text,
        minHeight: "calc(100vh - 8rem)",
      }}
    >
      {/* Grid keeps sticky predictable; flex align-items:stretch can confuse sticky in some engines */}
      <div className="mx-auto grid min-w-0 max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <aside className="z-10 hidden lg:block">
          <nav
            className="sticky top-24 z-10 max-h-[min(70vh,calc(100vh-7rem))] space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-stone-200/90 bg-white/80 p-4 shadow-sm"
            aria-label="On this page"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider text-stone-500"
              style={{ letterSpacing: "0.08em" }}
            >
              On this page
            </p>
            <ul className="space-y-1.5 text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block rounded-md border-l-2 border-transparent py-1.5 pl-3 -ml-px text-[13px] leading-snug text-stone-600 transition-colors hover:border-violet-500/50 hover:bg-violet-500/[0.08] hover:text-violet-900"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 pb-4" style={{ fontSize: "15px", lineHeight: 1.7 }}>
          <nav
            className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-stone-500"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="font-medium text-violet-800 transition-colors hover:text-violet-950 hover:underline"
            >
              Home
            </Link>
            <span aria-hidden className="text-stone-400">
              /
            </span>
            <span className="text-stone-700">Documentation</span>
          </nav>

          <h1
            className="text-3xl font-bold tracking-tight text-stone-900 sm:text-[2rem] sm:leading-tight"
          >
            Documentation
          </h1>
          <p className="lead mt-4 max-w-2xl text-base text-stone-600 sm:text-[1.0625rem] sm:leading-relaxed">
            Reference and onboarding for running golden evals, versioning agent code, and inspecting
            runs locally. Use the table of contents on wide screens to jump to a section.
          </p>

          <nav
            className="mt-8 rounded-xl border border-stone-200/90 bg-white/50 p-4 shadow-sm backdrop-blur-sm lg:hidden"
            aria-label="On this page"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">
              On this page
            </p>
            <ul className="flex flex-col gap-1.5 text-sm text-violet-900">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="underline-offset-2 transition-colors hover:text-violet-950 hover:underline"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div
            className="my-10 h-px w-full bg-stone-200"
            aria-hidden
          />

          {sections.map((s, sectionIndex) => {
            const id = slugify(s.title);
            const isLast = sectionIndex === sections.length - 1;
            const rows = s.rows ?? [];
            return (
              <section key={s.title} id={id} className="scroll-mt-28">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-[1.35rem]">
                  {s.title}
                </h2>

                {s.steps && (
                  <div className="mt-6 space-y-8">
                    <p className="text-stone-600">
                      Run these from your <strong className="font-medium text-stone-800">agent project root</strong>{" "}
                      (where{" "}
                      <code
                        className="rounded border border-stone-300 px-1.5 py-0.5 font-mono text-[13px] text-amber-900"
                        style={{ background: THEME.inlineCodeBg }}
                      >
                        agent-eval.yml
                      </code>{" "}
                      lives).
                    </p>
                    <dl className="space-y-6">
                      {s.steps.map((step) => (
                        <div key={step.cmd}>
                          <dt className="mb-2">
                            <CodeBlock>{step.cmd}</CodeBlock>
                          </dt>
                          <dd className="pl-0.5 text-stone-700">
                            {step.desc}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {s.numbered && (
                  <ol className="mt-6 list-none space-y-8 p-0">
                    {s.numbered.map((item, idx) => (
                      <li key={item.title} className="relative pl-0">
                        <div className="flex gap-4">
                          <span
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-amber-800/20 font-mono text-xs font-semibold tabular-nums text-amber-900"
                            style={{ background: THEME.stepBadgeBg }}
                            aria-hidden
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold tracking-tight text-stone-900">
                              {item.title}
                            </h3>
                            <p className="mt-2 text-stone-700">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {rows.length > 0 && (
                  <div
                    className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white/80 shadow-sm"
                    style={{ boxShadow: "0 1px 2px rgba(28,25,23,0.04)" }}
                  >
                    <table className="w-full min-w-[32rem] border-collapse text-left text-[14px]">
                      <thead>
                        <tr
                          className="border-b border-stone-200"
                          style={{ background: THEME.tableHeadBg }}
                        >
                          <th
                            scope="col"
                            className="px-4 py-3 text-[13px] font-semibold text-stone-800"
                            style={{ width: "38%" }}
                          >
                            {id.includes("api") ? "Endpoint" : id.includes("routes") ? "Route" : "Field"}
                          </th>
                          <th scope="col" className="px-4 py-3 text-[13px] font-semibold text-stone-800">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/90">
                        {rows.map(([key, val], i) => (
                          <tr
                            key={key}
                            className={
                              i < rows.length - 1 ? "border-b border-stone-100" : ""
                            }
                          >
                            <td className="align-top px-4 py-3 font-mono text-[12px] leading-snug text-violet-900 sm:text-[13px]">
                              {key}
                            </td>
                            <td className="align-top px-4 py-3 text-stone-700">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLast && (
                  <div className="my-14 h-px w-full bg-stone-200" aria-hidden />
                )}
              </section>
            );
          })}

          <footer className="-mt-8 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-10">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-violet-800 underline-offset-4 transition-colors hover:text-violet-950 hover:underline"
            >
              Open dashboard →
            </Link>
            <span className="text-stone-400">·</span>
            <a
              href="https://github.com/siddhantshah24/Agent-Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-stone-500 underline-offset-4 transition-colors hover:text-stone-800 hover:underline"
            >
              GitHub
            </a>
          </footer>
        </article>
      </div>
    </div>
  );
}
