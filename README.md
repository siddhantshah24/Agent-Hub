# AgentLab
---
## If it is not versioned and measured, it is not shipped.

The hardest part of shipping **agents** is rarely the model. It is **knowing whether the last change helped**, **showing that to someone who was not in the room**, and **keeping humans in the loop** when automation is wrong. Most teams still lack the same discipline they take for granted with code: **repeatable checks**, **versioned artifacts**, and **reviewable diffs**.

**AgentLab** is a **versioning and continuous integration platform for AI agents**: run golden evaluations on every meaningful change, tag runs like releases, compare versions with metrics and snapshots, wire in **per-sample feedback** and **notes**, and optional **observability** so traces line up with evals. If your organization already runs CI, you already understand the ambition: **the same integration mindset applied to agents** (tool calls, graphs, RAG stacks, LangGraph-style workflows, and anything you version like software).

The rest of this README states the **problem**, **who it is for**, **what we built**, and how it lines up with **standard hackathon judging** (impact, execution, responsibility to users, and clarity of story).

---

## Problem statement

**AI capabilities are advancing faster than the workflows around them.** Teams that ship agents face:

- **Fragmented tooling**: scripts and notebooks that do not compose into a single pipeline.
- **No comparable history**: without tags and snapshots, “better” is a feeling, not a diff.
- **Automation without ground truth**: scores alone miss what reviewers, PMs, or domain experts see in real outputs.
- **No release posture**: every demo looks like a one-off when nothing is versioned like a build.

The **gap between what agents can do** and what organizations can **measure, reproduce, and govern** is still wide. AgentLab targets teams who are tired of guessing.

---

## Who this is for


| Audience                         | What they get                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Engineers shipping agents**    | **Repeatable** `agentlab eval`, **tags**, **snapshots**, **rollback** the way you expect from serious tooling. |
| **Leads and reviewers**          | **Diffs** across metrics, code, and behavior, plus **notes** and **human feedback** next to the numbers.       |
| **Quality and reliability**      | **Regression** signals on a **fixed golden set**, **per-sample** drill-down, and **traces**.                   |
| **Anyone who signs off on risk** | **Feedback**, **export**, and **transparency** so judgment is not outsourced to a single opaque score.         |


---

## Solution in one place

AgentLab gives **versioning for AI agents** the way Git and CI give versioning for code. You run `**agentlab eval`** on a **golden dataset**, persist **tagged runs** and **file snapshots**, use a **Next.js dashboard** for history and trends, **compare two versions** in a **Diff Viewer** (behavior, code, metrics, optional narrative summaries and **improvement suggestions**), and capture **human judgment** through **per-sample feedback**, **version notes**, and **export** (for example datasets compatible with preference learning workflows). Optional **Langfuse** ties **traces** to those runs. Together, that is **continuous integration for agents**, a **repeatable pipeline** where automation, evidence, and **human signal** meet.

---

## More than a test suite: CI-style integration

**Testing** on golden tasks is the floor. AgentLab aims at the **full integration loop**:

- **Same pipeline every time** after changes that matter.
- **Versioned artifacts** so every run is comparable to the last.
- **History and trends** across tags, not one-off scores.
- **Diffs** so you see **what changed** in code and behavior, like a code review.
- **Human feedback** stored **alongside** metrics so iteration is informed by **both** automation and **people**.

---

## What AgentLab does

1. **Evaluate.** CLI eval runs. Persist samples and snapshots.
2. **Version.** Tags and rollback from snapshots.
3. **Integrate.** Repeat the pipeline. Charts and history show whether quality holds.
4. **Compare.** Diff Viewer with metrics, samples, code diffs, optional **AI-assisted** summaries and suggestions.
5. **Observe.** Optional **Langfuse** trace links per sample.
6. **Human feedback loop.** **Per-sample** thumbs and comments (API-backed), **version notes**, **export** combining feedback and outcomes. Suggestions can use **human signal** with failing samples. Reviewers stay **in the loop**, not beside it.

---

## Human feedback loop (first-class, not an afterthought)


| Mechanism               | Role                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Per-sample feedback** | Thumbs and comments keyed by run and sample; read/write **APIs**.                   |
| **Version notes**       | Human context on a **tag** for the next reviewer.                                   |
| **Diff + notes**        | Compare views show **notes** with metrics so judgment sits next to evidence.        |
| **Export**              | **JSONL export** for downstream training, audit, or tooling.                        |
| **Suggestions**         | Improvement ideas can reflect **human feedback** and failures, not only aggregates. |


This is how we answer “what happens when the tool is wrong in production?”: **reliability** through repeated golden tasks, **transparency** through traces and diffs, and **empowerment** through feedback and export so teams **retain agency**.

---

## Feature snapshot


| Area                | What ships                                                                      |
| ------------------- | ------------------------------------------------------------------------------- |
| **CLI**             | `init`, `eval`, `rollback`, `ui`                                                |
| **Versioning**      | Tags, snapshots, rollback, SQLite history                                       |
| **Dashboard**       | Projects, runs, charts, navigation                                              |
| **Diff & analysis** | Two-tag compare, regressions/improvements, **OpenAI-assisted** summaries, notes |
| **Human feedback**  | Per-sample feedback, version notes, RLHF-style export path                      |
| **Runs & traces**   | Per-tag pages. Langfuse when configured.                                        |
| **Stack**           | Python 3.10+, FastAPI, Next.js 16, optional Spline hero                         |



| Area                  | What you get                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **CLI**               | `init`, `eval`, `rollback`, `ui`                                                                       |
| **Config**            | `agent-eval.yml` per project, golden datasets, project-local runs                                      |
| **Versioning**        | Tags, file snapshots, rollback, SQLite-backed history                                                  |
| **Dashboard**         | Multi-project selector, run history, charts, navigation to runs and diffs                              |
| **Diff & compare**    | Two-tag compare, metric deltas, sample alignment, snapshot **code diff**, regressions and improvements |
| **Narrative layer**   | Behavioral summaries and ranked improvement suggestions tied to your metrics and feedback              |
| **Human feedback**    | Per-sample signals, version notes, diff views with notes, export for preference-style datasets         |
| **Runs & inspection** | Per-tag pages, per-sample rows, **trace** deep links per sample                                        |
| **API**               | FastAPI layer for runs, feedback, notes, export, diff payloads                                         |
| **UI**                | Next.js app, landing with **VERA**, docs, interactive demo-style panels where present                  |
| **Stack**             | Python 3.10+, FastAPI, Next.js 16, Spline scene on the landing hero                                    |


Hackathons often weight **impact**, **technical execution**, **responsibility** (safety, trust, empowerment), and **presentation**. Below is how AgentLab addresses each, in the language judges typically use.

### Impact potential — *Is this a real problem? Who does it affect? Why does it matter?*

Shipping **AI agents** at scale is a **real operational problem**: teams cannot afford to iterate without **comparable runs**, **version discipline**, and **reviewable evidence**. AgentLab affects **engineers**, **reviewers**, and **anyone accountable for production behavior**. It matters because **unmeasured agents are unshippable agents** once stakes rise.

### Technical execution — *Does the core functionality work? Does it demonstrate the idea effectively using AI?*

The path is **fully implemented**: **CLI** → **SQLite** → **FastAPI** (feedback, notes, export, diff, **LLM-assisted** summaries and suggestions) → **Next.js** UI. You bring **your own** agent projects under `target_projects/` (see **`agentlab init`**). **AI** is used where it adds **reviewer-facing** value (summaries, suggestions), grounded in **your** metrics and **your** feedback, not as a gimmick.

### Trust, harms, and empowerment — *Did the team think seriously about failure modes? Does this empower people?*

We treat **failure** as normal: golden tasks catch **regressions**; **diffs** and **traces** make decisions **inspectable**; **human feedback** and **export** keep **teams** in control rather than **dependent** on a single automated score. Snapshots and code diffs also make **what changed** in the agent **visible** for review. The product is built to **empower** operators and reviewers, not replace them.

### Presentation — *Can the team explain what they built, why, and what they would do next?*

This README is the **narrative**. The UI introduces **VERA** as a **versioning guide**. **[SETUP.md](SETUP.md)** gives **reproducible** steps. The natural demo story is **eval → dashboard → feedback → compare versions**; the roadmap is **more integrations, harder eval suites, and production hosting** (already documented for split UI/API deploys).

---

## Repository layout

```text
AgentHub/
├── agent_lab/
│   ├── agent_lab_core/     # CLI, runner, SQLite, FastAPI
│   └── agent_lab_ui/       # Next.js (dashboard, diff, runs, docs, Spline hero)
├── target_projects/        # Empty in git — add your agent projects here (not committed)
├── SETUP.md
├── .env.example
└── README.md
```

**Target projects**

`target_projects/` is kept in the repo as an **empty directory** (via `.gitignore` rules and a `.gitkeep` file). **Create** a subfolder, run **`agentlab init`** inside it to scaffold `agent-eval.yml`, then add `src/`, `datasets/`, and your agent code. Each project typically has `agent-eval.yml`, `src/`, and `datasets/`.

---

## Get running in minutes

1. **Python 3.10+**, **Node 18+**, **Docker** (recommended for local Langfuse).
2. `pip install -e agent_lab/` and `npm install` in `agent_lab/agent_lab_ui`.
3. Copy `**.env.example`** to `**.env**`. Set `**OPENAI_API_KEY**` and Langfuse keys as needed.
4. Create `target_projects/my_agent` (or any name), `cd` there, run **`agentlab init`**, add agent code and datasets until **`agentlab eval --limit 5`** succeeds, then from repo root run **`agentlab ui`**.

Defaults: API **8000**, UI **3001**. Full detail: **[SETUP.md](SETUP.md)**.

---

## Hosting

Build the Next app with `**NEXT_PUBLIC_API_URL`** set to your API; run `**uvicorn agent_lab_core.server:app**` with `**AGENTLAB_PROJECTS_ROOT**` or `**AGENTLAB_DB**`. See **[SETUP.md](SETUP.md)** → *Hosting (production)*.

---

## Commands


| Command                               | Purpose                           |
| ------------------------------------- | --------------------------------- |
| `agentlab init`                       | Create `agent-eval.yml`           |
| `agentlab eval [--tag …] [--limit N]` | Run evaluation and record results |
| `agentlab rollback --tag <tag>`       | Restore from snapshot             |
| `agentlab ui`                         | Start FastAPI + Next.js locally   |


---

## Providers

---

- **OpenAI** powers **behavioral summaries** and **improvement suggestions** in the API (`.env.example`).  
- **Target agents** may use **Groq**, **OpenAI**, or other LangChain models; add the matching package per project.

## Documentation


| Doc                                | Use                                    |
| ---------------------------------- | -------------------------------------- |
| **[SETUP.md](SETUP.md)**           | Install, env, hosting, troubleshooting |
| `agent_lab/agent_lab_ui/README.md` | UI notes                               |


---

## License and attribution

Include your license and credits (**Spline**, **Langfuse**, model providers) as required for your submission.