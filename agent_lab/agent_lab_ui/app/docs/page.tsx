import Link from "next/link";

const PAGE_BG = "#1a1628";
const BORDER = "#2a2444";
const RULE = "rgba(255,255,255,0.08)";
const CODE_BG = "#0c0a12";
const TITLE = "#f8fafc";
const TEXT = "#e2e8f0";
const MUTED = "#9ca3c9";
const LINK = "#c4b5fd";
const CODE_FG = "#86efac";

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
      className="my-0 overflow-x-auto rounded-md border px-3 py-2.5 font-mono text-[12.5px] leading-relaxed sm:text-[13px]"
      style={{
        background: CODE_BG,
        borderColor: BORDER,
        color: CODE_FG,
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
      className="relative min-w-0 w-full pb-24 pt-4"
      style={{ background: PAGE_BG, color: TEXT }}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 gap-10 px-4 lg:gap-14 lg:px-8">
        {/* ── TOC (docs sidebar) ─────────────────────────────────────────── */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav
            className="sticky top-24 space-y-3 border-l pl-4"
            style={{ borderColor: BORDER }}
            aria-label="On this page"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: MUTED }}
            >
              On this page
            </p>
            <ul className="space-y-2 text-sm">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block border-l-2 border-transparent py-0.5 pl-3 -ml-[17px] text-[13px] leading-snug transition-colors hover:border-violet-500/50 hover:text-slate-200"
                    style={{ color: MUTED }}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Main article ───────────────────────────────────────────────── */}
        <article
          className="min-w-0 max-w-[42rem] flex-1 pb-8"
          style={{ fontSize: "15px", lineHeight: 1.7 }}
        >
          <nav
            className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium"
            style={{ color: MUTED }}
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:underline" style={{ color: LINK }}>
              Home
            </Link>
            <span aria-hidden className="opacity-50">
              /
            </span>
            <span style={{ color: TEXT }}>Documentation</span>
          </nav>

          <h1
            className="text-3xl font-bold tracking-tight sm:text-[2rem] sm:leading-tight"
            style={{ color: TITLE }}
          >
            Documentation
          </h1>
          <p className="lead mt-4 text-base sm:text-[1.0625rem]" style={{ color: MUTED }}>
            Reference and onboarding for running golden evals, versioning agent code, and inspecting
            runs locally. Use the table of contents on wide screens to jump to a section.
          </p>

          <nav
            className="mt-8 rounded-lg border p-4 lg:hidden"
            style={{ borderColor: BORDER, background: "rgba(0,0,0,0.2)" }}
            aria-label="On this page"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
              On this page
            </p>
            <ul className="flex flex-col gap-1.5 text-sm" style={{ color: LINK }}>
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="underline-offset-2 hover:underline">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div
            className="my-10 h-px w-full"
            style={{ background: RULE }}
            aria-hidden
          />

          {sections.map((s, sectionIndex) => {
            const id = slugify(s.title);
            const isLast = sectionIndex === sections.length - 1;
            const rows = s.rows ?? [];
            return (
              <section key={s.title} id={id} className="scroll-mt-28">
                <h2
                  className="text-xl font-semibold tracking-tight sm:text-[1.35rem]"
                  style={{ color: TITLE }}
                >
                  {s.title}
                </h2>

                {s.steps && (
                  <div className="mt-6 space-y-8">
                    <p style={{ color: MUTED }}>
                      Run these from your <strong style={{ color: TEXT }}>agent project root</strong>{" "}
                      (where <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px]" style={{ color: LINK }}>agent-eval.yml</code> lives).
                    </p>
                    <dl className="space-y-6">
                      {s.steps.map((step) => (
                        <div key={step.cmd}>
                          <dt className="mb-2">
                            <CodeBlock>{step.cmd}</CodeBlock>
                          </dt>
                          <dd className="pl-0.5" style={{ color: TEXT }}>
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
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-xs font-semibold tabular-nums"
                            style={{
                              background: "rgba(124,58,237,0.15)",
                              color: LINK,
                              border: `1px solid ${BORDER}`,
                            }}
                            aria-hidden
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3
                              className="text-base font-semibold tracking-tight"
                              style={{ color: TITLE }}
                            >
                              {item.title}
                            </h3>
                            <p className="mt-2" style={{ color: TEXT }}>
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {rows.length > 0 && (
                  <div className="mt-6 overflow-x-auto rounded-lg border" style={{ borderColor: BORDER }}>
                    <table className="w-full min-w-[32rem] border-collapse text-left text-[14px]">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.25)" }}>
                          <th
                            scope="col"
                            className="px-4 py-3 font-semibold"
                            style={{ color: TITLE, width: "38%" }}
                          >
                            {id.includes("api") ? "Endpoint" : id.includes("routes") ? "Route" : "Field"}
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold" style={{ color: TITLE }}>
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([key, val], i) => (
                          <tr
                            key={key}
                            style={{
                              borderBottom:
                                i < rows.length - 1 ? `1px solid ${BORDER}` : undefined,
                            }}
                          >
                            <td
                              className="align-top px-4 py-3 font-mono text-[12px] leading-snug sm:text-[13px]"
                              style={{ color: LINK }}
                            >
                              {key}
                            </td>
                            <td className="align-top px-4 py-3" style={{ color: TEXT }}>
                              {val}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLast && (
                  <div className="my-14 h-px w-full" style={{ background: RULE }} aria-hidden />
                )}
              </section>
            );
          })}

          <footer className="-mt-8 flex flex-wrap items-center gap-3 border-t pt-10" style={{ borderColor: RULE }}>
            <Link
              href="/dashboard"
              className="text-sm font-medium underline-offset-4 transition-colors hover:underline"
              style={{ color: LINK }}
            >
              Open dashboard →
            </Link>
            <span style={{ color: MUTED }}>·</span>
            <a
              href="https://github.com/siddhantshah24/Agent-Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium underline-offset-4 transition-colors hover:underline"
              style={{ color: MUTED }}
            >
              GitHub
            </a>
          </footer>
        </article>
      </div>
    </div>
  );
}
