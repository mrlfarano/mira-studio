# Product Idea — Mira

## One-liner

Mira is a verification-first visual studio for indie SaaS and client-product developers who direct multiple coding agents to build an MVP feature by feature.

## Background

The founder is a senior developer on an enterprise architecture team that delivers web applications. Their experience is in stacks, enterprise integrations, architecture-aligned workflows, and ITSM delivery; they are also building Mira as a premium product that may bundle third-party model inference.

Mira comes from a recurring delivery problem: prompting agents is not the hard part, but coordinating several agents, retaining context, and knowing whether a feature is actually ready takes too long. The first market is indie developers rather than enterprise teams, so the product must retain delivery confidence without importing enterprise ceremony.

## The problem

An indie developer can prompt-engineer effectively, but building an MVP feature by feature across several coding-agent sessions is slow and opaque. They cannot reliably see how a feature fits the MVP, what each agent changed, the feature's dependencies, whether the pieces work together, or whether it is safe to ship.

Today, that coordination happens across prompts, terminals, issue trackers, and the developer's own reconstruction of agent context and test status. The desired workflow is **graph engineering**: visualizing the MVP, its composable feature blocks, dependencies, agent activity, and verification state so agents can move delivery forward faster.

## Target user

Indie developers building a real SaaS or client product, already using two to five coding-agent sessions across a non-trivial codebase, who need to ship features without personally reconstructing agent context and test status.

## Proposed solution

Mira turns a new-app MVP outcome into an editable visual graph of three to eight feature blocks and their dependencies. A developer assigns each ready block to an agent; every block shows intent, live agent output, changed files, checks, and a ship-or-blocked state.

The magic moment is: **enter an MVP outcome, see its feature graph, direct agents through ready blocks, and know which delivered blocks are verified.** Existing codebases are supported in the first release, but imported architecture must be explicitly marked as needing review rather than presented as certain.

## Why you

The founder builds real web applications under architectural and delivery constraints and can translate the parts of enterprise agent delivery that create speed and confidence—structured work, visible dependencies, and evidence of completion—into a lightweight visual studio for indie builders.

## Candidates considered

| Rank | Candidate | Who it’s for | What it does | Why this founder |
|---:|---|---|---|---|
| 1 | **Mira: verification-first agent studio** | Indie developers shipping a real app with two to five coding agents | Turns a feature outcome into bounded agent work, makes runs and decisions visible, and ends with evidence of what changed, passed, and remains risky. | Extracts useful enterprise delivery discipline—traceability and proof—without enterprise process. |
| 2 | **Agent delivery evidence layer** | Indie developers already using Codex, Claude Code, or Cursor | Collects agent outputs, terminal state, tests, and review findings into one ship-or-no-ship brief. | Directly attacks the evidence gap and is narrower than a full studio. |
| 3 | **Architecture-aware agent workspaces** | Technical indies starting a serious SaaS or client application | Provides opinionated workspace presets that encode stack, architecture constraints, agent roles, and delivery gates. | Makes the founder's architecture background visible, if the workflow stays lightweight. |
| 4 | **Managed multi-model agent workspace** | Indies who want reliable access to several coding models | Bundles provider routing and inference with the multi-agent workspace. | Could support premium pricing, but is a capability rather than a switching reason. |

| Candidate | Unfair advantage | Pain level | Audience reachability | MVP feasibility | Differentiation |
|---|---|---|---|---|---|
| 1. Verification-first agent studio | 🟡 Operating knowledge is strong; indie proof is untested. | 🟢 Context loss and unverifiable agent output are recurrent pains. | 🟡 A concrete indie community or channel is still needed. | 🟡 Existing breadth must be narrowed into one decisive flow. | 🟡 “Multi-agent cockpit” needs the evidence outcome to be distinct. |
| 2. Agent delivery evidence layer | 🟢 Strong fit with enterprise delivery background. | 🟢 Clear pain once an indie uses several agents. | 🟡 Distribution is unproven, though the promise is easier to explain. | 🟢 A focused report and workflow can ship quickly. | 🟢 Evidence, review, and residual-risk reporting is a sharp promise. |
| 3. Architecture-aware workspaces | 🟢 Directly rooted in architecture expertise. | 🟡 Early-stage indies may resist ceremony. | 🟡 Reachable through technical builders, but narrower. | 🟡 Templates are easy to copy; workflow enforcement is harder. | 🟡 Needs a very opinionated first stack or use case. |
| 4. Managed multi-model workspace | 🔴 Provider access is not a durable moat. | 🟡 Convenience is real; urgency is uncertain. | 🟡 Broad audience, crowded expectation. | 🔴 Billing, reliability, and provider economics enlarge the MVP. | 🔴 Routing alone is not enough to win. |

## Risky assumptions

1. Indie developers using multiple agents will change their workflow for a visual feature graph rather than stay with prompts, terminals, and issue trackers.
2. The graph can coordinate and explain agent work faster than it costs to create or maintain it.
3. A premium managed-inference plan can be priced with enough margin and trust to be preferable to users bringing their own provider keys.

## Next step

Pressure-test this idea with the **Idea Validator** skill before planning. The validation should test whether the visual graph changes real delivery behavior and whether “graph engineering” is a paid painkiller for the defined indie developer.
