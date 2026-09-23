# Graph Engineering Research Implications for Mira

_Reviewed: 2026-08-08 · Source: [Graph Engineering Field Guide](https://mrlfarano.github.io/GraphEngineeringResearch/) and its [public repository](https://github.com/mrlfarano/GraphEngineeringResearch)_

## Executive decision

The research strengthens Mira's technical thesis but does not change the current **Weak** market-validation verdict.

It establishes that explicit graphs can be valuable when branching, resumability, approval, recovery, path evaluation, or independently owned work make a simpler workflow insufficient. It does **not** establish that indie developers experience this often enough to change tools or pay for Mira.

The product implication is decisive:

> Mira's graph must be a visual projection of the delivery system's authoritative state—not a diagram the user maintains beside the real work.

If changing an edge does not change which feature block is ready, what an agent may do, which evidence is required, or whether the MVP can ship, the graph is decorative and should not be the product wedge.

## What the research establishes

| Research conclusion | Implication for Mira |
|---|---|
| The smallest workflow that meets measured requirements is the right graph. | Do not make multi-agent execution or a graph mandatory. Start with one agent and promote complexity only when the feature requires it. |
| A graph earns its name when it is explicit, executable, inspectable, checkpointable, evaluable, and independently versioned. | Feature blocks and dependency edges must be typed runtime objects, not sticky notes and arrows. |
| State is a contract rather than a transcript. | A block should store authoritative outcome, readiness, evidence, approval, budget, error, and version data; prompts are derived from that state. |
| Deterministic code should own policy, validation, persistence, routing bounds, and consequential writes. | Models may interpret and plan locally, but Mira owns transitions, permissions, retries, cancellation, and ship gates. |
| Parallel workers help only when work is genuinely decomposable. | Mira should visualize why work is safe to parallelize and prevent agents from sharing mutable scope accidentally. Agent count is not a success metric. |
| Clients receive safe event projections from server-owned orchestration. | The studio should render sequenced status, artifacts, approvals, and outcomes without exposing provider credentials or internal reasoning. |
| Recovery, evaluation, idempotency, security, and observability are graph-level requirements. | “Verified” must mean recorded evidence and policy, not an agent's self-declared completion message. |
| Workflow graphs and knowledge graphs solve different problems. | Do not add GraphRAG or an architecture knowledge graph merely to reinforce the word “graph.” Add it only if measured retrieval needs justify it. |

## What changes in the Mira framing

### Before

“Enter an MVP outcome, see its feature graph, and direct multiple agents through feature blocks.”

### Sharpened hypothesis

“Turn an MVP outcome into a small executable delivery graph that shows why each feature block is ready or blocked, constrains what an agent may do next, and carries the evidence needed for a ship decision.”

This is a validation hypothesis, not an approved edit to `docs/product-idea.md`. The Idea Validator verdict remains Weak until customer evidence exists.

### The visual selling point

The visual layer is valuable only when it makes load-bearing runtime facts easier to act on:

- Which block is ready, and which exact dependency keeps another blocked.
- Which agent owns the current bounded action and what it may change.
- Which artifact, diff, test, approval, or unresolved risk supports the state.
- Why a route was chosen and what fallback applies.
- What must still become true before the MVP can ship.

The product is not a general canvas, a task board with arrows, or a graph-runtime framework selector.

## Current code gap

| Surface | Current implementation | Missing for the hypothesis |
|---|---|---|
| Spark data model | `sticky`, `text`, and `shape` elements with position, size, color, and content. | Typed feature nodes, typed dependency edges, readiness rules, terminal states, versions, and validation. |
| Arrows | Standalone drawable shapes. | Edges that reference source and target nodes and constrain execution. |
| Ask Mira | Concatenates canvas text into one prompt requesting suggestions. | State-aware planning that reads graph contracts and writes bounded, validated patches. |
| Persistence | Saves arbitrary `elements: unknown[]` JSON by canvas name. | Schema validation, graph versioning, safe names/paths, migrations, checkpoints, and corrupt-state handling. |
| Agent execution | Separate terminal, Kanban, and agent surfaces. | One orchestration owner connecting feature readiness, isolated run ownership, events, artifacts, checks, and approval. |
| Verification | Not represented by the Spark model. | Evidence registry, check provenance, residual risk, and explicit ship/blocked policy. |

The present Spark Canvas can support a concierge mockup, but it is not yet an executable feature graph.

## The minimum graph contract to test

The concierge pilot needs only enough structure to test decision value:

```yaml
feature_graph:
  outcome: "User-visible MVP outcome"
  terminal_states: [shippable, blocked, stopped]

feature_block:
  id: "stable-id"
  outcome: "One observable result"
  state: proposed | ready | running | verify | blocked | accepted
  depends_on: ["block-id"]
  owner: human | agent-run-id
  allowed_scope: ["paths or bounded capability"]
  evidence_required: ["test, diff, artifact, or approval"]
  evidence_observed: []
  unresolved_risk: []

dependency_edge:
  from: "block-id"
  to: "block-id"
  condition: "Finite, inspectable readiness condition"
  fallback: "What happens when the condition fails"
```

During a pilot, the founder may enforce these rules manually. Automation is not required to learn whether the graph changes the participant's decision.

## What the research does not answer

These remain customer-discovery questions:

1. **Pain frequency:** How often does a qualifying indie developer lose time or confidence because agent work crosses dependencies, handoffs, or verification boundaries?
2. **Economic cost:** What did the last incident cost in minutes, rework, delayed release, or a bad ship decision?
3. **Complexity threshold:** Did the feature actually require a branch, resume, approval, parallel work, or different retry policy—or would a linear checklist have been better?
4. **Graph maintenance:** Who keeps the representation correct, and does upkeep cost less than the coordination work it replaces?
5. **Decision utility:** Does the participant use an edge, readiness state, or evidence field to change the next action or ship decision without prompting?
6. **Switching behavior:** What current workflow must Mira displace, and what failure has made the participant actively seek an alternative?
7. **Payment:** Will the participant pay for this outcome rather than praise the concept?
8. **Managed inference:** Does bundling providers increase trust and convenience enough to justify margin and operational risk? The technical research does not support making this part of the initial proof.

## What we are waiting for from Reddit and DEV

_Authenticated audit: 2026-08-08 21:49 EDT_

All six outreach messages are live. None has a direct reply yet.

| Candidate | What their response must clarify |
|---|---|
| `CrackityJones33` | After worktrees solve isolation, what coordination or verification work remains across five to seven sessions, and what did the last failure cost? |
| Karun Japhet | How ordering, cold handoffs, review, and silent semantic failures are handled; whether the workflow is personally controlled and eligible for an indie-tool purchase. |
| `psychomafia.tiger` | Whether remote visibility already solves the pain, or whether cross-agent dependencies and combined readiness remain unresolved on a personally controlled product. |
| `buildwithpulkit` | How much time manual diff/review/merge consumes and how the next safe worktree task is chosen. |
| `NatureLover5217` | Whether session handoffs and manual testing create a repeated state/evidence problem that a visual system would actually change. |
| `DeepFuckingVigo` | Whether the existing planning and agent-communication workflow already solves coordination, leaving review/testing as the narrower paid problem. |

An answer counts only if it leads to a reconstruction of recent behavior. A like, conceptual discussion, or generic feature request is not validation evidence.

## Outreach timing

- Do not send another message to the same people before the 72-hour response window closes.
- At 72 hours, if fewer than two people have agreed to an interview, activate a small second batch from the existing Priority B/reserve list.
- At five to seven days, send at most one concise follow-up to the original candidates who remain silent.
- Keep the interview focused on the last real feature before introducing graph terminology or showing Mira.

## Decision boundary

The research is sufficient to guide a future implementation architecture. It is not sufficient to authorize that implementation.

Proceed to Product Planner only after the validation sprint proves all of the following:

1. Repeated, costly coordination or verification pain.
2. A real complexity threshold where a graph beats a list or single-agent loop.
3. A load-bearing graph state changes next-task or ship decisions.
4. Graph upkeep costs less than the work it replaces.
5. At least one participant pays for continued use.
