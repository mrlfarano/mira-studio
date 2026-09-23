# Mira Validation Sprint

_14-day evidence sprint · prepared 2026-08-08_

## Decision this sprint must make

Determine whether indie developers who already direct multiple coding agents will pay for a visual MVP feature graph because it reduces coordination and ship-decision time enough to beat prompts, terminals, and issue trackers.

This is not a feature-development sprint. Its output is one of three decisions:

1. **Proceed** — the graph changes observed delivery behavior and at least one design partner pays.
2. **Narrow** — the pain is real, but the graph is too costly; test the agent-delivery evidence layer instead.
3. **Stop or change buyer** — the defined indie developer does not show repeated pain or willingness to pay.

Do not run Product Planner until this gate is decided.

## Evidence gates

| Gate | Minimum evidence | Pass condition |
|---|---|---|
| Problem interviews | 6 eligible indie developers | At least 3 independently describe a multi-agent coordination or verification failure from the previous 30 days and quantify its time, rework, or ship-risk cost. |
| Graph necessity | Every pilot identifies the simplest sufficient workflow | At least 2 pilots expose branching, resumability, approval, recovery, or parallel-dependency behavior that a linear list or single-agent loop does not handle well. |
| Concierge pilots | 3 participants with a real MVP feature and repository | At least 2 complete the feature-graph flow and use it to choose the next task or make a ship/blocked decision. |
| Coordination value | Before/after timing from every completed pilot | At least 2 pilots reduce time-to-next-safe-task or time-to-defensible-ship-decision by 30%, with graph upkeep costing less time than it saves. |
| Payment | A direct offer after the pilot | At least 1 participant pays $99 for a founding design-partner continuation. The payment is credited toward the first three paid months if Mira launches. |

The $99 offer is a validation instrument, not final pricing. Do not discount it during the conversation or replace payment with a compliment, waitlist signup, or non-binding promise.

## Eligible participant

A participant qualifies only when all of these are true:

- They are personally building a SaaS, paid client product, or substantial open-source product.
- They used at least two coding-agent sessions on the same feature or codebase during the previous seven days.
- They can screen-share or reconstruct a real recent feature workflow.
- They control their workflow and could choose to pay for an individual developer tool.
- They are not evaluating Mira as a favor from a close friend or teammate.

Enterprise developers may participate only when they also build an indie product and answer from that workflow.

## Recruitment message

Send this individually to relevant people in the founder's technical network. The first contact asks for a conversation, not a sale.

> I’m researching how solo developers coordinate multiple coding agents on one feature. I’m not pitching a product in this call—I want to reconstruct the last feature you built with two or more agent sessions and understand where time or confidence disappeared. Would you be open to a 30-minute screen-share this week?

If the personal network does not produce six eligible interviews, ask interviewees for one introduction to another qualifying builder. Avoid ads, automated outreach, and broad surveys during this sprint.

## Five-question problem interview

Do not show Mira, mention graph engineering, or ask hypothetical willingness-to-pay questions until all five questions are answered.

1. **Walk me through the last feature where you used two or more coding-agent sessions.** Start with the outcome you wanted and end with what shipped.
2. **Show me how you decided what each agent should do next.** What artifacts, tabs, terminals, or issue trackers did you consult?
3. **Where did you lose context, duplicate work, wait on a dependency, or discover that an agent's work was not actually ready?** What happened next?
4. **How much time or rework did that incident cost, and how often has something similar happened in the previous month?** Ask for a concrete estimate or consequence.
5. **What have you already tried to prevent it?** What did you keep using, abandon, configure, or pay for?

End with: “May I map one current feature with you in a follow-up working session?” Invite only eligible participants who demonstrated a concrete failure.

After the five core questions, use these non-leading probes only where the participant's story raises them:

- What part of that workflow had to branch, pause and resume, wait for approval, recover, or run independently?
- Would a linear checklist have handled it? If not, show exactly where it failed.
- What artifact was authoritative when two sessions disagreed: conversation, spec, task, diff, test, or something else?
- Who or what owned the decision about the next safe action?
- What evidence changed the final ship decision, and what evidence was missing?

## Interview evidence record

Create one row per participant. Use an ID in the repository; keep names and contact details outside git.

Copy [`validation-templates/interview-session.md`](./validation-templates/interview-session.md) for each eligible session. Copy [`validation-templates/pilot-session.md`](./validation-templates/pilot-session.md) for each concierge pilot; it includes the editable Mermaid feature graph, block registry, agent evidence log, timing calculations, ship decision, and paid-offer record.

| ID | Eligible? | Current tool stack | Recent feature | Observed failure | Frequency | Time/rework/risk cost | Existing workaround | Pilot invited? | Evidence link |
|---|---|---|---|---|---|---|---|---|---|
| P01 |  |  |  |  |  |  |  |  |  |
| P02 |  |  |  |  |  |  |  |  |  |
| P03 |  |  |  |  |  |  |  |  |  |
| P04 |  |  |  |  |  |  |  |  |  |
| P05 |  |  |  |  |  |  |  |  |  |
| P06 |  |  |  |  |  |  |  |  |  |

## Concierge pilot protocol

The pilot tests the graph's decision value. It does not test automatic graph generation, managed inference, or the completeness of the current Mira application.

### 1. Capture the baseline

Before creating a graph, record:

- The participant's desired feature outcome.
- Their normal decomposition and coordination method.
- How long it takes them to identify the first safe task.
- Their current answer to “What must be true before this feature can ship?”
- Their confidence in that answer from 1–5, as secondary context only.

### 2. Build the graph manually

With the participant, create three to eight feature blocks. Every block must have:

- A user-visible or system outcome.
- Explicit dependencies and a ready/blocked state.
- One bounded owner at a time: the participant, founder, or an identified agent run.
- The scope that owner is allowed to change.
- Links or references to changed files.
- Required evidence and the evidence actually observed.
- A final ship/blocked decision with unresolved risk.

At least one edge must be load-bearing: changing its condition must change which block is ready, whether an agent may start, or whether the feature can ship. If no edge has that effect, record that a graph was unnecessary for the feature.

Use the simplest available surface. Manual preparation is allowed; visual polish and graph-generation automation are not part of the test.

### 3. Observe delivery

Do not rescue the participant by silently coordinating for them. Record:

- Time from feature brief to the first safe agent task.
- Time spent maintaining or correcting the graph.
- Time required to identify the next safe task after an agent finishes.
- Duplicated work, dependency surprises, and invalid verification claims.
- Time from the last agent result to a defensible ship/blocked decision.
- Which graph fields the participant actually consults without prompting.
- Whether the participant uses topology or readiness relationships, rather than only reading node cards as a task list.
- Whether a simpler checklist or single-agent loop would have produced the same decision with less upkeep.

### 4. Make the paid offer

After the participant has made the ship/blocked decision, say:

> I’m offering a $99 founding design-partner continuation. It includes two more guided feature-graph deliveries and direct input into the first product version; if Mira launches, the payment is credited toward your first three paid months. Do you want to continue at that price?

Record **paid**, **declined**, or **different offer requested**, followed by the participant's exact objection. Do not negotiate during the sprint.

## Pilot measurement record

| Metric | Pilot A | Pilot B | Pilot C |
|---|---:|---:|---:|
| Participant ID |  |  |  |
| Feature blocks |  |  |  |
| Baseline time to first safe task |  |  |  |
| Graph time to first safe task |  |  |  |
| Baseline time to ship/blocked decision |  |  |  |
| Graph time to ship/blocked decision |  |  |  |
| Graph setup and upkeep time |  |  |  |
| Duplicate/dependency failures avoided |  |  |  |
| Load-bearing edge changed a decision? |  |  |  |
| Simpler workflow sufficient? |  |  |  |
| Used graph without prompting? |  |  |  |
| Payment outcome |  |  |  |
| Exact objection or purchase reason |  |  |  |

## Daily sequence

| Day | Action | Required output |
|---:|---|---|
| 1 | Identify 12 individually reachable candidates and send 6 personal interview requests. | Candidate list outside git; outreach count recorded. |
| 2–4 | Run the first 3 problem interviews and revise only follow-up wording, not the core five questions. | Three complete evidence rows. |
| 5–6 | Run the remaining 3 interviews and select pilot candidates based on observed pain. | Six complete rows; problem gate scored. |
| 7 | Prepare Pilot A's manual feature graph and baseline sheet. | One pilot-ready graph. |
| 8–10 | Run Pilots A and B. | Two complete measurement columns. |
| 11–12 | Run Pilot C and make the paid offer to all completed pilots. | Third measurement column; three payment outcomes. |
| 13 | Compare evidence against every gate. Do not average away a failed payment gate. | Written proceed/narrow/stop decision. |
| 14 | Re-run Idea Validator using the observed behavior, stated price, and conversion evidence. | Replaced `docs/validation-report.md` with a current verdict. |

## Decision rules

- **Proceed to Product Planner** only when all five evidence gates pass.
- **Narrow to the agent-delivery evidence layer** when interview pain and payment pass but graph coordination value fails.
- **Narrow to a list or single-agent delivery workflow** when pain exists but the graph-necessity gate fails.
- **Improve graph automation and repeat the pilot** when pain passes, users consult the graph, and graph upkeep alone causes the coordination gate to fail.
- **Change the buyer or stop** when fewer than three interviews reveal a concrete recent failure or no pilot participant will pay.
- **Do not count** enthusiasm, feature requests, survey intent, waitlist signups, or founder use as substitutes for the gates.

## Sprint status

- [x] 12 candidates identified
- [x] 6 interview requests sent
- [ ] At least 2 interview acceptances received
- [ ] 6 eligible interviews completed
- [ ] Problem gate scored
- [ ] Graph-necessity gate scored
- [ ] 3 concierge pilots completed
- [ ] Coordination-value gate scored
- [ ] 3 direct paid offers made
- [ ] Payment gate scored
- [ ] Proceed/narrow/stop decision written
- [ ] Idea Validator re-run
