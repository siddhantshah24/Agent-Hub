import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { VeraMascot } from "@/components/vera";

export const metadata: Metadata = {
  title: "Documentation | AgentLab",
  description:
    "agent_lab_core package structure, configuration, agent contract, Python APIs, CLI, and REST endpoints for integrating AgentLab.",
};

const docSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-slate-200/90 bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800 [font-family:var(--font-mono),ui-monospace,monospace]">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-800 [font-family:var(--font-mono),ui-monospace,monospace] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      {children}
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className={`${docSerif.className} scroll-mt-32 mt-14 text-2xl font-semibold tracking-tight text-slate-950 first:mt-0 sm:text-[1.65rem]`}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className={`${docSerif.className} mt-8 text-lg font-semibold text-slate-900`}>{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[15px] leading-[1.75] text-slate-700">{children}</p>;
}

const toc = [
  { href: "#package-structure", label: "Package structure" },
  { href: "#configuration", label: "Configuration" },
  { href: "#agent-contract", label: "Agent contract" },
  { href: "#python-runner", label: "Runner API" },
  { href: "#python-db", label: "Database API" },
  { href: "#python-langfuse", label: "Langfuse helpers" },
  { href: "#cli", label: "CLI" },
  { href: "#http", label: "HTTP API" },
  { href: "#environment", label: "Environment" },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(260px,380px)] xl:gap-14">
        <article
          className="min-w-0 border-slate-200/80 pb-6 lg:border-r lg:pb-8 lg:pr-6 xl:pr-10"
          aria-labelledby="docs-title"
        >
          <header className="border-b border-slate-200 pb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">SDK reference</p>
            <h1
              id="docs-title"
              className={`${docSerif.className} mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.125rem] sm:leading-tight`}
            >
              Documentation
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              How to use the <Code>agent_lab_core</Code> Python package, the Typer CLI, and the FastAPI server from your own code and
              automation. This reference describes modules, functions, and HTTP routes, not how the repository was authored.
            </p>
          </header>

          <div className="mt-12 min-w-0 max-w-none">
            <H2 id="package-structure">Package structure</H2>
            <P>
              The installable package name is <Code>agent-lab</Code>; import paths use the <Code>agent_lab_core</Code> namespace.
            </P>
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-[14px] text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-900">Module</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agent_lab_core.parser</td>
                    <td className="px-4 py-3">
                      <Code>EvalConfig</Code> dataclass and <Code>parse_config(path)</Code> for YAML evaluation config.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agent_lab_core.runner</td>
                    <td className="px-4 py-3">
                      <Code>run_evaluation(...)</Code>, <Code>rollback_to_tag(...)</Code>, evaluation loop and snapshots.
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agent_lab_core.db</td>
                    <td className="px-4 py-3">SQLite access for runs, per-sample rows, and human feedback.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agent_lab_core.server</td>
                    <td className="px-4 py-3">FastAPI <Code>app</Code> exposing JSON for the dashboard and external clients.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agent_lab_core.langfuse_util</td>
                    <td className="px-4 py-3">
                      <Code>get_langfuse_trace_api_client()</Code>, <Code>sync_langfuse_env_for_client()</Code> for trace APIs.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              Install the distribution in your environment (for example <Code>pip install -e ./agent_lab</Code> from a checkout). Console
              entry point: <Code>agentlab</Code> → <Code>agent_lab_core.cli:app</Code>.
            </P>

            <H2 id="configuration">Configuration</H2>
            <H3>EvalConfig</H3>
            <P>
              Returned by <Code>parse_config(config_path: Path) -&gt; EvalConfig</Code>. Fields:
            </P>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-slate-700">
              <li>
                <Code>entrypoint: str</Code> · Module and callable, e.g. <Code>&quot;src.graph:run_agent&quot;</Code>.
              </li>
              <li>
                <Code>dataset_path: Path</Code> · Absolute path to the JSONL file (resolved relative to the YAML file).
              </li>
              <li>
                <Code>input_key: str</Code> · Column in each JSONL row whose value is passed into the agent (see Agent contract).
              </li>
              <li>
                <Code>expected_output_key: str</Code> · Ground-truth column for scoring.
              </li>
              <li>
                <Code>match_mode: str</Code> · <Code>&quot;exact&quot;</Code>, <Code>&quot;contains&quot;</Code>, or numeric tolerance via float comparison.
              </li>
            </ul>
            <H3>YAML schema</H3>
            <P>Minimal <Code>agent-eval.yml</Code> shape the parser expects:</P>
            <Pre>
              {`agent:
  entrypoint: "src.graph:run_agent"
dataset:
  path: "datasets/evals.jsonl"
  input_key: "question"
  expected_output_key: "answer"
  match_mode: "exact"   # optional`}
            </Pre>

            <H2 id="agent-contract">Agent contract</H2>
            <P>
              The runner imports your <Code>entrypoint</Code> and calls the callable with two arguments: an input dict and a LangChain-style{" "}
              <Code>invoke_config</Code> dict (callbacks, run name, metadata).
            </P>
            <P>
              <strong className="text-slate-900">Input dict.</strong> The value for each dataset row is read from <Code>row[input_key]</Code>, but
              the runner always passes it under the key <Code>&quot;question&quot;</Code>:{" "}
              <Code>{`{"question": <value>}`}</Code>. Your function should accept that shape (or wrap it).
            </P>
            <P>
              <strong className="text-slate-900">Return value.</strong> Prefer a dict with <Code>answer</Code> or <Code>output</Code> (string). Other
              values are stringified. For optional RAGAS metrics, include <Code>contexts: list[str]</Code> (retrieved passages); otherwise RAGAS
              scoring is skipped for that sample.
            </P>

            <H2 id="python-runner">Runner API</H2>
            <H3>run_evaluation</H3>
            <Pre>
              {`def run_evaluation(
    config: EvalConfig,
    tag: str | None,
    project_root: Path,
    db_path: Path,
    langfuse_public_key: str,
    langfuse_secret_key: str,
    langfuse_host: str = "http://localhost:3000",
    force: bool = False,
    limit: int | None = None,
    notes: str = "",
) -> dict:`}
            </Pre>
            <P>
              Runs the full JSONL eval: content hash, snapshot under <Code>.agentlab/snapshots/&lt;tag&gt;/</Code>, Langfuse callbacks when keys
              are non-empty, per-sample metrics, aggregate stats, and SQLite persistence.
            </P>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] text-slate-700">
              <li>
                <Code>tag</Code> · If <Code>None</Code>, a tag is auto-generated. If the tag exists and <Code>force</Code> is false, raises{" "}
                <Code>ValueError</Code>.
              </li>
              <li>
                <Code>limit</Code> · If set, only the first N rows of the dataset are evaluated.
              </li>
              <li>
                <Code>notes</Code> · Stored on the run; if empty, an automatic note may be derived from the previous snapshot diff.
              </li>
            </ul>
            <P>
              <strong className="text-slate-900">Returns</strong> a dict with at least: <Code>tag</Code>, <Code>success_rate</Code>,{" "}
              <Code>avg_latency_ms</Code>, <Code>avg_cost_usd</Code>, <Code>total_cases</Code>, <Code>passed</Code>, <Code>content_hash</Code>,{" "}
              <Code>notes</Code>.
            </P>
            <H3>rollback_to_tag</H3>
            <Pre>
              {`def rollback_to_tag(tag: str, project_root: Path, db_path: Path) -> None`}
            </Pre>
            <P>
              Copies <Code>*.py</Code> from the snapshot directory for <Code>tag</Code> back into the resolved source directory for your
              entrypoint. Raises if no snapshot exists for the tag or paths are missing.
            </P>

            <H2 id="python-db">Database API</H2>
            <P>
              All functions take a <Code>db_path: Path</Code> to <Code>.agentlab.db</Code> unless you rely on server-side{" "}
              <Code>AGENTLAB_DB</Code>. Call <Code>init_db(db_path)</Code> before writing if you bypass the runner.
            </P>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-[13px] text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2.5 font-semibold text-slate-900 sm:px-4">Function</th>
                    <th className="px-3 py-2.5 font-semibold text-slate-900 sm:px-4">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">insert_run(...)</td>
                    <td className="px-3 py-2.5 sm:px-4">Insert aggregated metrics for one version; returns new run id.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">insert_samples(db, run_id, rows)</td>
                    <td className="px-3 py-2.5 sm:px-4">Persist per-sample results for a run.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">get_all_runs(db)</td>
                    <td className="px-3 py-2.5 sm:px-4">List all runs (history for dashboards).</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">get_run_by_tag(db, tag)</td>
                    <td className="px-3 py-2.5 sm:px-4">One run row by version tag, or None.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">get_samples_for_tag(db, tag)</td>
                    <td className="px-3 py-2.5 sm:px-4">All sample rows for a version.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">update_run_notes(db, tag, notes)</td>
                    <td className="px-3 py-2.5 sm:px-4">Update stored notes string; returns whether a row was updated.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">tag_exists(db, tag)</td>
                    <td className="px-3 py-2.5 sm:px-4">Boolean guard before insert.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">upsert_feedback(...)</td>
                    <td className="px-3 py-2.5 sm:px-4">Save human thumbs and optional comment per sample.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-slate-800 sm:px-4">get_feedback_for_run(db, run_id)</td>
                    <td className="px-3 py-2.5 sm:px-4">Feedback rows for RLHF and review flows.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <H2 id="python-langfuse">Langfuse helpers</H2>
            <Pre>
              {`def sync_langfuse_env_for_client() -> None
def get_langfuse_trace_api_client() -> Any`}
            </Pre>
            <P>
              <Code>sync_langfuse_env_for_client</Code> maps <Code>LANGFUSE_HOST</Code> into <Code>LANGFUSE_BASE_URL</Code> for SDK v3-style
              clients. <Code>get_langfuse_trace_api_client</Code> returns a client suitable for trace list and get operations used by the API
              layer.
            </P>

            <H2 id="cli">CLI</H2>
            <P>
              Typer app <Code>agentlab</Code> wraps the same runner and rollback logic with cwd-based paths. Commands:
            </P>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-[14px] text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-900">Command</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agentlab init</td>
                    <td className="px-4 py-3">Write a starter <Code>agent-eval.yml</Code> in the current directory.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agentlab eval ...</td>
                    <td className="px-4 py-3">Load env, parse config, call <Code>run_evaluation</Code> with <Code>project_root=cwd</Code>.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agentlab rollback --tag T</td>
                    <td className="px-4 py-3">Call <Code>rollback_to_tag</Code> for the cwd project.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-[13px] text-slate-800">agentlab ui</td>
                    <td className="px-4 py-3">
                      Spawn uvicorn on <Code>agent_lab_core.server:app</Code> and Next.js with <Code>NEXT_PUBLIC_API_URL</Code> set.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <H2 id="http">HTTP API</H2>
            <P>
              ASGI app: <Code>agent_lab_core.server:app</Code>. Base URL is whatever host you bind (for example <Code>http://localhost:8000</Code>
              ). Most routes accept optional query <Code>project</Code> when <Code>AGENTLAB_PROJECTS_ROOT</Code> is set for multi-project
              databases.
            </P>
            <H3>Runs and samples</H3>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] text-slate-700">
              <li>
                <Code>GET /api/projects</Code> · List projects and run counts.
              </li>
              <li>
                <Code>GET /api/versions?project=...</Code> · All runs from SQLite.
              </li>
              <li>
                <Code>GET /api/samples/{`{tag}`}</Code> · Per-sample rows for one version.
              </li>
              <li>
                <Code>PATCH /api/runs/{`{tag}`}/notes</Code> · JSON body <Code>{`{"notes": "..."}`}</Code> · Update run notes.
              </li>
              <li>
                <Code>GET /api/snapshot/{`{tag}`}</Code> · Snapshot metadata, file list, and graph source for the Code view.
              </li>
            </ul>
            <H3>Comparison and traces</H3>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] text-slate-700">
              <li>
                <Code>GET /api/diff/{`{v1}`}/{`{v2}`}</Code> · Metric deltas, regressions, LLM summary.
              </li>
              <li>
                <Code>GET /api/snapshot-diff/{`{v1}`}/{`{v2}`}</Code> · Unified diff of snapshot sources.
              </li>
              <li>
                <Code>GET /api/samples-compare/{`{v1}`}/{`{v2}`}</Code> · Merged sample table.
              </li>
              <li>
                <Code>GET /api/traces/{`{tag}`}</Code> · Trace ids and payloads for drill-down (Langfuse-backed).
              </li>
            </ul>
            <H3>Feedback and suggestions</H3>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] text-slate-700">
              <li>
                <Code>POST /api/feedback</Code> · Body: <Code>tag</Code>, <Code>sample_idx</Code>, <Code>score</Code> (±1), optional{" "}
                <Code>comment</Code>, optional <Code>project</Code>.
              </li>
              <li>
                <Code>GET /api/feedback/{`{tag}`}</Code> · Feedback list for a run.
              </li>
              <li>
                <Code>POST /api/suggest/{`{tag}`}</Code> · LLM suggestions from snapshot + samples + feedback.
              </li>
              <li>
                <Code>POST /api/apply-suggestion/{`{tag}`}</Code> · Apply a returned suggestion to source (see server for body shape).
              </li>
              <li>
                <Code>GET /api/export-rlhf/{`{tag}`}</Code> · Export bundle for preference training pipelines.
              </li>
            </ul>
            <P>
              <Code>GET /health</Code> · Liveness for load balancers.
            </P>

            <H2 id="environment">Environment</H2>
            <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-[14px] text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-900">Variable</th>
                    <th className="px-4 py-3 font-semibold text-slate-900">Role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-800">AGENTLAB_DB</td>
                    <td className="px-4 py-3">Explicit SQLite path for the API and CLI when not using cwd resolution.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-800">AGENTLAB_PROJECTS_ROOT</td>
                    <td className="px-4 py-3">Parent directory of multiple project folders, each with its own <Code>.agentlab.db</Code>.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-800">NEXT_PUBLIC_API_URL</td>
                    <td className="px-4 py-3">Browser-side API origin for the Next.js app.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[11px] leading-snug text-slate-800 sm:text-[12px]">
                      LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_HOST
                    </td>
                    <td className="px-4 py-3">Tracing from evals and trace API in the dashboard.</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-800">OPENAI_API_KEY</td>
                    <td className="px-4 py-3">
                      Required for API features that call OpenAI: diff behavioral summary and run suggestions. Optional{" "}
                      <Code>OPENAI_MODEL</Code> overrides the default chat model.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-[12px] text-slate-800">GROQ_API_KEY</td>
                    <td className="px-4 py-3">Only if your agent code uses Groq; not used by the AgentLab API for summaries or suggestions.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-600">
              <Link href="/dashboard" className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-4 hover:text-violet-900">
                Open dashboard
              </Link>
              <span className="mx-2 text-slate-300">·</span>
              <Link href="/" className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-4 hover:text-violet-900">
                Back to home
              </Link>
            </p>
          </div>
        </article>

        <aside
          className="min-w-0 lg:sticky lg:top-24 lg:self-start xl:top-28"
          aria-label="On this page"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
              On this page
            </p>
            <nav className="mt-3 flex flex-col gap-0.5 border-t border-slate-200/90 pt-3">
              {toc.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="border-l-[3px] border-transparent py-1.5 pl-3 text-[13px] leading-snug text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950 sm:text-[14px] sm:leading-relaxed"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="mt-5 rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-slate-50 p-4 shadow-sm sm:p-5">
            <div className="flex gap-3 sm:gap-4">
              <VeraMascot size={52} showFootnote={false} className="shrink-0" title="VERA: versioning guide" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">VERA</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                  Your guide in the app: follow version tags from eval runs to diffs and traces so every change stays
                  explainable to you and your team.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
