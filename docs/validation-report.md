# Validation Report — Mira

_Generated: 2026-08-08_

## Verdict

**Weak**

The idea is coherent and the founder has a credible delivery-systems advantage, but there is no evidence yet that the defined indie buyer experiences this as a painful, paid problem rather than an attractive workflow improvement. The current promise also overlaps with incumbent coding agents that already run parallel work and expose agent status, diffs, and review; the visual graph must demonstrate a faster or safer delivery decision to earn a switch.

The [Graph Engineering Field Guide](https://mrlfarano.github.io/GraphEngineeringResearch/) strengthens the implementation rationale for explicit state, bounded transitions, evidence, approvals, recovery, and evaluation. It does not supply buyer, urgency, switching, or payment evidence, so the verdict remains Weak.

## Scorecard

| Area | Score | Read |
|---|---:|---|
| Pain intensity | 3/5 | The founder experiences the coordination cost, but no indie user's frequency, time cost, or willingness to pay has been observed. |
| Buyer clarity | 2/5 | “Indie SaaS or client-product developer using two to five agents” is a behavior range, not yet a reachable person, named community, or buying moment. |
| Urgency | 2/5 | Faster MVP delivery is valuable, but no evidence shows users will interrupt their existing agent workflow to solve it now. |
| Differentiation | 2/5 | Parallel agents, status, diff review, and handoff are already offered by incumbent tools; a feature graph alone is not a switching reason. |
| Speed to validate | 4/5 | Mira already has multi-terminal, Kanban, companion, observability, and a canvas surface, so a narrow concierge test can run quickly. |
| Founder advantage | 4/5 | The founder understands architecture-constrained delivery and agent operations; the remaining challenge is translating that advantage without enterprise ceremony. |

## Core Assumption

Indie developers who already direct multiple coding agents will pay for a visual MVP feature graph because it reduces coordination and ship-decision time enough to beat their current prompt, terminal, and issue-tracker workflow.

## Fatal Flaws

| Risk | Severity | Why It Matters | Fast Test |
|---|---|---|---|
| No observed customer behavior | High | The only pain evidence is the founder's own experience; without real users, there is no basis to claim a paid painkiller. | Conduct six problem interviews with indies who ran multiple coding-agent tasks in the previous week; ask them to reconstruct their last feature delivery and quantify time lost, without pitching Mira. |
| Feature graph may be dashboard theater | High | Codex already presents multi-agent work as a command center, and Cursor already shows background-agent status, follow-ups, takeover, diffs, and review. A graph that does not change sequencing or a ship decision adds setup cost. | Give three users the same realistic feature: let them use their normal workflow once, then a manually curated Mira graph once. Measure time to identify the next safe task and time to state whether the feature is ready. |
| A graph may be unnecessary complexity | High | The research recommends promoting to an explicit graph only when branching, resumability, approval, recovery, path evaluation, or parallel ownership defeats a simpler approach. If a list or single-agent loop is enough, Mira's visual graph is overhead. | In every pilot, identify the exact complexity threshold and require one edge, interrupt, or readiness condition to change a real next action. If this cannot be observed, narrow to the evidence layer. |
| First-release scope hides the proof | Medium | New-app MVP planning, existing-codebase import, multi-agent execution, verification, visual graphing, and managed inference are several products. The proof can disappear beneath platform work. | Offer one narrow paid design-partner pilot: a new-app MVP brief mapped to three to eight feature blocks, with one agent run and one evidence-backed ship/blocked decision. |

## Problem Reality

- **Pain:** The founder says, “I can prompt engineer just fine, but it takes too long,” because they must reconstruct the MVP, feature dependencies, agent output, and verification state across separate tools. Frequency and time cost for other indies are unverified.
- **Early adopter:** A solo technical founder actively building a SaaS, who has used at least two coding-agent sessions on the same feature in the past week and can name the point at which they lost context or made a risky ship decision. This is a proposed persona, not a verified customer.
- **Vitamin or painkiller:** **Vitamin today.** It becomes a painkiller only if users can show that the graph avoids a repeated expensive failure—duplicate work, blocked dependencies, lost context, or shipping an unverified feature—and will change tools or pay to prevent it.

## Competition

- **Current behavior:** The founder's stated alternative is prompts, terminals, and issue trackers plus manual reconstruction of context and test state. [OpenAI describes Codex as a multi-agent command center with parallel worktrees and cloud environments](https://openai.com/codex/); [Cursor provides background-agent status, follow-ups, takeover, and agent-machine access](https://docs.cursor.com/background-agent), plus [diff review and checkpoints](https://docs.cursor.com/chat/overview).
- **Real enemy:** The incumbent workflow is not a lack of agent visibility; it is the perceived cost of introducing another planning surface before coding. Mira must remove cognitive work, not require the user to maintain a second representation of the project.
- **Differentiation needed:** A graph must be executable and evidence-bearing: it should determine what can run next, make uncertain dependencies explicit, bind agent output and checks to the relevant feature block, and make a ship/blocked decision faster than an agent sidebar plus issue tracker can.

## Research Reconciliation

- **Established technically:** Explicit graphs are appropriate when measured workflow requirements need branching, resume, bounded retries, approval, recovery, path evaluation, or independent parallel work. State, transitions, side effects, events, and evaluations should be versioned contracts.
- **Not established commercially:** The research does not show that indie developers hit those thresholds frequently, want a visual control plane, will maintain or trust its state, or will pay for it.
- **Current Mira gap:** Spark stores generic canvas elements, treats arrows as shapes, concatenates note text into a suggestion prompt, and persists unvalidated `unknown[]` elements. It can mock the pilot but is not yet a load-bearing graph.
- **Implementation boundary:** Do not select a graph framework or build runtime orchestration until the pilot proves that an explicit graph changes behavior. The full mapping is in [`docs/graph-engineering-research-implications.md`](./graph-engineering-research-implications.md).

## First 10 Customers

1. **Start with the founder's technical network.** Invite six indie builders who used multiple coding-agent sessions in the past week to a 30-minute retrospective of their most recent feature. The first message asks for the walkthrough, not a purchase. **Success:** six completed interviews and three instances of a concrete coordination failure with a time or risk cost.
2. **Recruit three design partners from communities where people publicly ship agent-built projects**—for example, the founder's existing indie-builder peers, local technical groups, or small creator communities they already participate in. Offer a concierge feature-delivery map for a current MVP feature. **Success:** three users bring a real repository and let the founder observe the workflow end to end.
3. **Ask the three pilots for a paid continuation, not a compliment.** After the feature is delivered, show the before/after evidence and ask for a specific paid pre-order or a scheduled paid pilot. **Success:** at least one payment or paid commitment; if none convert, document the objection and pivot the target or promise.

## MVP

- **Build:** A concierge-assisted new-app flow that converts one MVP outcome into three to eight editable feature blocks. Each block owns an observable outcome, readiness state, explicit dependencies, one bounded owner, evidence requirements, observed evidence, and unresolved risk. At least one dependency or approval condition must change a real next action. The graph may be manually enforced during the test; automation is not the hypothesis.
- **Cut:** Managed inference and billing, provider routing, general-purpose canvas editing, pair mode, registry presets, broad observability, and automated existing-codebase architecture extraction. Existing-repository import can be shown only as an explicitly uncertain follow-on, not as a core test flow.
- **2-week test:** Run three real indie MVP features through the concierge flow. For each, record time from brief to first actionable block, time spent identifying the next safe task, and time to reach a defensible ship/blocked call. Require each participant to choose between a paid continuation at a stated price, a different narrowly framed offer, or no offer. If no participant pays or the graph does not reduce coordination time, pivot from “MVP studio” to the narrower evidence layer—or stop investing in visual graphing.

## Edits Applied to product-idea.md

No product-idea.md edits — verdict was Weak.

## Next Step

Hold off on Product Planner. Execute the interview, graph-necessity, concierge-pilot, payment, and decision gates in [`docs/validation-sprint.md`](./validation-sprint.md), then re-run validation with observed behavior, the stated price, and conversion data.
